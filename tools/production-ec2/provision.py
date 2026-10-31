"""Execute only in authenticated AWS CloudShell after exact cost/access approval.

One idempotently tagged instance. Never reads credentials or starts a second node.
"""
import argparse
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import boto3

ACCOUNT = '327614158380'
REGION = 'us-east-1'
TAG = '1a2ad9d6-28a2-4448-b5d9-a619caaf3baa'
AMI = 'ami-0d6dd9e8265d48906'
GROUP = 'jupiter-producer'
CONTROL_ROLE = 'JupiterProducerEc2Control'
STOP_ROLE = 'JupiterProducerEc2Stop'
NAME = 'jupiter-producer-ec2-20261031'
STATE = Path('/home/cloudshell-user/jupiter-producer-provision-state.json')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--approved-access', action='store_true', required=True)
    args = parser.parse_args()
    if not args.approved_access:
        raise SystemExit('Explicit action-time access approval required')
    assert boto3.client('sts').get_caller_identity()['Account'] == ACCOUNT
    ec2 = boto3.client('ec2', region_name=REGION)
    iam = boto3.client('iam')
    scheduler = boto3.client('scheduler', region_name=REGION)
    existing = [i for r in ec2.describe_instances(Filters=[{'Name': 'tag:JupiterProducerDeployment', 'Values': [TAG]}])['Reservations'] for i in r['Instances'] if i['State']['Name'] != 'terminated']
    if existing:
        print(json.dumps({'existing': [{'id': i['InstanceId'], 'state': i['State']['Name']} for i in existing], 'action': 'No instance created or restarted. Resume exact existing setup only.'}))
        return
    # AMI must remain the pinned, free official Ubuntu image, not Marketplace.
    image = ec2.describe_images(ImageIds=[AMI])['Images'][0]
    assert image['OwnerId'] == '099720109477' and not image.get('ProductCodes')
    vpc = ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])['Vpcs'][0]['VpcId']
    subnet = sorted(ec2.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc]}, {'Name': 'state', 'Values': ['available']}])['Subnets'], key=lambda s: s['AvailabilityZone'])[0]
    root = Path(__file__).resolve().parent
    tags = [{'Key': 'Name', 'Value': NAME}, {'Key': 'JupiterProducerDeployment', 'Value': TAG}]
    for role, trust, policy in [(CONTROL_ROLE, 'control-trust', 'control-policy'), (STOP_ROLE, 'stop-trust', 'stop-policy')]:
        try:
            iam.create_role(RoleName=role, AssumeRolePolicyDocument=(root / 'access' / (trust + '.json')).read_text(), Tags=tags)
        except iam.exceptions.EntityAlreadyExistsException:
            found = iam.get_role(RoleName=role)['Role']
            assert {t['Key']: t['Value'] for t in found.get('Tags', [])}.get('JupiterProducerDeployment') == TAG
            assert found['AssumeRolePolicyDocument'] == json.loads((root / 'access' / (trust + '.json')).read_text())
        iam.put_role_policy(RoleName=role, PolicyName='DedicatedProducerOnly', PolicyDocument=(root / 'access' / (policy + '.json')).read_text())
    try:
        scheduler.create_schedule_group(Name=GROUP, Tags=tags)
    except scheduler.exceptions.ConflictException:
        assert {t['Key']: t['Value'] for t in scheduler.list_tags_for_resource(ResourceArn=f'arn:aws:scheduler:{REGION}:{ACCOUNT}:schedule-group/{GROUP}')['Tags']}.get('JupiterProducerDeployment') == TAG
    sg = ec2.create_security_group(GroupName=NAME, Description='Signed HTTPS producer; restricted operator SSH', VpcId=vpc, TagSpecifications=[{'ResourceType': 'security-group', 'Tags': tags}])['GroupId']
    ec2.authorize_security_group_ingress(GroupId=sg, IpPermissions=[{'IpProtocol': 'tcp', 'FromPort': p, 'ToPort': p, 'IpRanges': [{'CidrIp': ip}]} for p, ip in [(22, '72.92.10.150/32'), (80, '0.0.0.0/0'), (443, '0.0.0.0/0')]])
    key_name = NAME
    ec2.import_key_pair(KeyName=key_name, PublicKeyMaterial=(root / 'operator.pub').read_bytes(), TagSpecifications=[{'ResourceType': 'key-pair', 'Tags': tags}])
    user_data = (root / 'cloud-init.sh').read_text()
    assert 'PRIVATE KEY' not in user_data and 'LIVEKIT_API_SECRET' not in user_data
    # Give newly created IAM trust time to propagate before paid launch.
    time.sleep(15)
    instance_id = None
    try:
        result = ec2.run_instances(ImageId=AMI, InstanceType='c7i.2xlarge', MinCount=1, MaxCount=1, ClientToken=TAG, KeyName=key_name, NetworkInterfaces=[{'DeviceIndex': 0, 'SubnetId': subnet['SubnetId'], 'Groups': [sg], 'AssociatePublicIpAddress': True}], BlockDeviceMappings=[{'DeviceName': '/dev/sda1', 'Ebs': {'VolumeSize': 30, 'VolumeType': 'gp3', 'Encrypted': True, 'DeleteOnTermination': True}}], MetadataOptions={'HttpTokens': 'required', 'HttpEndpoint': 'enabled', 'HttpPutResponseHopLimit': 1}, InstanceInitiatedShutdownBehavior='stop', UserData=user_data, TagSpecifications=[{'ResourceType': kind, 'Tags': tags} for kind in ['instance', 'volume']])
        instance = result['Instances'][0]
        instance_id = instance['InstanceId']
        # Freeze the deadline from original LaunchTime. Never extend during retries.
        deadline = instance['LaunchTime'].astimezone(timezone.utc) + timedelta(minutes=105)
        state = {'instanceId': instance_id, 'tag': TAG, 'securityGroupId': sg, 'launchTime': instance['LaunchTime'].isoformat(), 'setupStopAt': deadline.isoformat(), 'setupCapUsd': 5, 'recordingEnabled': False}
        STATE.write_text(json.dumps(state, indent=2))
        for role in [CONTROL_ROLE, STOP_ROLE]:
            policy = iam.get_role_policy(RoleName=role, PolicyName='DedicatedProducerOnly')['PolicyDocument']
            for statement in policy['Statement']:
                if statement.get('Resource') == f'arn:aws:ec2:{REGION}:{ACCOUNT}:instance/*':
                    statement['Resource'] = f'arn:aws:ec2:{REGION}:{ACCOUNT}:instance/{instance_id}'
            iam.put_role_policy(RoleName=role, PolicyName='DedicatedProducerOnly', PolicyDocument=json.dumps(policy))
        schedule = 'producer-setup-stop-' + instance_id
        scheduler.create_schedule(Name=schedule, GroupName=GROUP, ScheduleExpression='at(' + deadline.strftime('%Y-%m-%dT%H:%M:%S') + ')', ScheduleExpressionTimezone='UTC', FlexibleTimeWindow={'Mode': 'OFF'}, ActionAfterCompletion='DELETE', State='ENABLED', Target={'Arn': 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances', 'RoleArn': f'arn:aws:iam::{ACCOUNT}:role/{STOP_ROLE}', 'Input': json.dumps({'InstanceIds': [instance_id]}), 'RetryPolicy': {'MaximumEventAgeInSeconds': 300, 'MaximumRetryAttempts': 2}})
        guard = scheduler.get_schedule(Name=schedule, GroupName=GROUP)
        assert guard['State'] == 'ENABLED' and guard['Target']['RoleArn'].endswith('/' + STOP_ROLE) and json.loads(guard['Target']['Input'])['InstanceIds'] == [instance_id]
        allocation = ec2.allocate_address(Domain='vpc', TagSpecifications=[{'ResourceType': 'elastic-ip', 'Tags': tags}])
        ec2.associate_address(AllocationId=allocation['AllocationId'], InstanceId=instance_id)
        state.update({'publicIp': allocation['PublicIp'], 'allocationId': allocation['AllocationId'], 'setupSchedule': schedule, 'cloudStopVerified': True, 'controlRoleArn': f'arn:aws:iam::{ACCOUNT}:role/{CONTROL_ROLE}', 'stopRoleArn': f'arn:aws:iam::{ACCOUNT}:role/{STOP_ROLE}', 'schedulerGroup': GROUP})
        STATE.write_text(json.dumps(state, indent=2))
        print(json.dumps(state))
    except BaseException:
        # Discover exact tag if RunInstances succeeded but its response was lost.
        ids = [instance_id] if instance_id else [i['InstanceId'] for r in ec2.describe_instances(Filters=[{'Name': 'tag:JupiterProducerDeployment', 'Values': [TAG]}])['Reservations'] for i in r['Instances'] if i['State']['Name'] in ['pending', 'running']]
        if ids:
            for iid in ids:
                current = ec2.describe_instances(InstanceIds=[iid])['Reservations'][0]['Instances'][0]['State']['Name']
                if current == 'pending':
                    ec2.get_waiter('instance_running').wait(InstanceIds=[iid], WaiterConfig={'Delay': 5, 'MaxAttempts': 24})
                ec2.stop_instances(InstanceIds=[iid])
        raise


if __name__ == '__main__':
    main()
