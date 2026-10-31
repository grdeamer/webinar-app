import 'server-only'
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2'
import { SchedulerClient, CreateScheduleCommand, GetScheduleCommand } from '@aws-sdk/client-scheduler'
import { fromWebToken } from '@aws-sdk/credential-providers'
import { getVercelOidcToken } from '@vercel/oidc'
import { startProducerEc2, stopProducerEc2, type ProducerEc2Port } from '../ec2Lifecycle.ts'
import type { EngineScope } from './protocol.ts'
export function producerBackend() {
  const backend = process.env.PRODUCER_ENGINE_BACKEND || 'sandbox'
  if (!['ec2', 'sandbox'].includes(backend)) throw new Error('Unknown producer backend')
  return backend
}
export function validateEc2Scope(scope: EngineScope) {
  if (scope.eventId !== process.env.PRODUCER_ENGINE_EC2_EVENT_ID || scope.sessionId !== process.env.PRODUCER_ENGINE_EC2_SESSION_ID) throw new Error('This EC2 producer belongs to a different event session')
}
async function port(): Promise<ProducerEc2Port> {
  if (producerBackend() !== 'ec2') throw new Error('EC2 producer is not selected')
  if (process.env.PRODUCER_ENGINE_SESSION_CAP_USD !== '5') throw new Error('Explicit five-dollar session authorization required')
  const id = process.env.PRODUCER_ENGINE_EC2_INSTANCE_ID || '', role = process.env.PRODUCER_ENGINE_EC2_ROLE_ARN || '', stopRole = process.env.PRODUCER_ENGINE_EC2_STOP_ROLE_ARN || '', group = process.env.PRODUCER_ENGINE_EC2_SCHEDULE_GROUP || ''
  const region = process.env.PRODUCER_ENGINE_EC2_REGION || 'us-east-1'
  if (!/^i-[a-f0-9]{17}$/.test(id) || !/^[a-z0-9-]{1,64}$/.test(group) || !/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(role) || !/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/.test(stopRole) || region !== 'us-east-1') throw new Error('EC2 producer configuration incomplete')
  const options = { region, maxAttempts: 2, credentials: fromWebToken({ roleArn: role, webIdentityToken: await getVercelOidcToken(), roleSessionName: 'jupiter-producer-ec2' }) }
  const ec2 = new EC2Client(options), scheduler = new SchedulerClient(options), name = `producer-stop-${id}`
  return {
    async state() { const r = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [id] })); return r.Reservations?.flatMap(x => x.Instances || [])[0]?.State?.Name || 'unknown' },
    async stopAt() {
      try {
        const r = await scheduler.send(new GetScheduleCommand({ Name: name, GroupName: group }))
        const input = JSON.parse(r.Target?.Input || '{}'), match = /^at\(([^)]+)\)$/.exec(r.ScheduleExpression || '')
        if (r.State !== 'ENABLED' || r.ScheduleExpressionTimezone !== 'UTC' || r.FlexibleTimeWindow?.Mode !== 'OFF' || r.Target?.Arn !== 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances' || r.Target.RoleArn !== stopRole || JSON.stringify(input.InstanceIds) !== JSON.stringify([id]) || !match) throw new Error('Unverified EC2 shutdown schedule')
        return Date.parse(match[1] + 'Z')
      } catch (e) { if (e instanceof Error && e.name === 'ResourceNotFoundException') return null; throw e }
    },
    async arm(atMs) { await scheduler.send(new CreateScheduleCommand({ Name: name, GroupName: group, ScheduleExpression: `at(${new Date(atMs).toISOString().slice(0, 19)})`, ScheduleExpressionTimezone: 'UTC', State: 'ENABLED', FlexibleTimeWindow: { Mode: 'OFF' }, ActionAfterCompletion: 'DELETE', Target: { Arn: 'arn:aws:scheduler:::aws-sdk:ec2:stopInstances', RoleArn: stopRole, Input: JSON.stringify({ InstanceIds: [id] }), RetryPolicy: { MaximumEventAgeInSeconds: 300, MaximumRetryAttempts: 2 } } })) },
    async start() { await ec2.send(new StartInstancesCommand({ InstanceIds: [id] })) },
    async stop() { await ec2.send(new StopInstancesCommand({ InstanceIds: [id] })) },
  }
}
export async function ec2ProducerStatus() { const p = await port(); return { state: await p.state(), stopAtMs: await p.stopAt(), recordingEnabled: false, backend: 'ec2' } }
export async function prepareEc2Producer(scope: EngineScope) { validateEc2Scope(scope); return startProducerEc2(await port()) }
export async function stopEc2Producer(scope: EngineScope) { validateEc2Scope(scope); return stopProducerEc2(await port()) }
