# Dedicated producer EC2 preparation — not provisioned

One Linux x86-64 c7i.2xlarge, 8 vCPU / 16 GiB, us-east-1. This is one
producer Program, not the older ten-satellite EC2 plan. Website remains Vercel;
LiveKit remains media transport. The selected pipeline is not a whole-host HA
solution: primary/standby share this host.

Before launching: obtain explicit cost approval, pin the official Ubuntu AMI,
verify the exact Vercel production OIDC identity and dedicated tagged instance,
prepare a cloud shutdown at <=2 hours for initial setup and verify it before
installation. Do not launch unless that independent shutdown can be armed.
No paid resources, DNS changes or IAM grants are created by this directory.

Install an official checksum-verified Node 24 runtime, the reviewed source
bundle and pinned dependencies/browser while setup shutdown is armed. Create
`jupiter-producer` unprivileged system user. Install `start-engine.sh` under
`/opt/jupiter-producer/`. Install credentials with mode 0600 using the sealed configuration download over pinned SSH;
never user-data, logs, shell history or command arguments. The service env file
must be root-owned and readable only by systemd. Environment requires
LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET / PRODUCER_ENGINE_SECRET and
the one authorized PRODUCER_ENGINE_EVENT_ID / PRODUCER_ENGINE_SESSION_ID.

Disable swap and core dumps. All browser profiles, media temp files and engine
state live under /run/jupiter-producer (tmpfs); the immutable source and
installed dependencies live on encrypted gp3. No capture/recording, snapshots,
EBS media or persistent runtime state. Journals contain metadata only.

Caddy terminates trusted HTTPS at the approved DNS hostname; expose TCP443,
TCP80 for certificate issuance/renewal, and administrative SSH only from the
operator's confirmed /32. Do not expose 8080 or 4311. Control endpoint still
requires HMAC, bounded request bodies, same-event/session scoping and replay
checks. Restrict egress appropriately for LiveKit HTTPS/WebRTC, package setup,
DNS and certificate renewal. No ALB or NAT Gateway is required.

Install guest service/timer. Enable only after private configuration and cloud
shutdown are verified. Each EC2 boot starts a fresh 20-minute media session;
guest shutdown occurs by 30 minutes, independently of the cloud stop. The
service never restarts automatically. Initial setup ends with EC2 stopped.

Vercel production config, after verified deployment and explicit approval:
PRODUCER_ENGINE_BACKEND=ec2; PRODUCER_ENGINE_URL=https://approved-host;
PRODUCER_ENGINE_SESSION_CAP_USD=5; PRODUCER_ENGINE_EC2_INSTANCE_ID;
PRODUCER_ENGINE_EC2_REGION=us-east-1; PRODUCER_ENGINE_EC2_ROLE_ARN;
PRODUCER_ENGINE_EC2_STOP_ROLE_ARN; PRODUCER_ENGINE_EC2_SCHEDULE_GROUP;
PRODUCER_ENGINE_EC2_EVENT_ID and PRODUCER_ENGINE_EC2_SESSION_ID. Preserve the
approved existing engine signing secret. Do not enable both backends or use
Sandbox as fallback. Retire the Sandbox preparation variables after EC2
cutover succeeds and verify all old Sandbox sessions stopped.

Use temporary AWS OIDC credentials, production Vercel project only. Control
role: regional DescribeInstances, Start/Stop only the exact new instance,
Create/GetSchedule only its named stop schedule, iam:PassRole only its stop
role and scheduler.amazonaws.com. Stop role trusts Scheduler with exact
account/group scope and can only ec2:StopInstances for that instance. It cannot
start/terminate. IAM policy must be checked with actual IDs before applying.

Manual app Start requires a verified enabled cloud stop before StartInstances.
A repeated start/restart retains its original deadline, never extends it.
Stop requests preserve the shutdown schedule. A stop-start within the same
window has only the remaining time. New 30-minute windows are available after
the old schedule completes and deletes itself. No start from page loads or
status polls. Invalid budget/configuration/status prevents paid starts.

Qualification after cost approval: instance + no-recording configuration,
cloud and guest shutdowns, authenticated app status/start/stop, no-op page
loads, exact scope rejection, generated moving 1080p30 and original browser
file capture, optional audio separately, failover, then stop and verify zero
worker processes and stopped EC2. Do not claim the native publisher passed a
hosted hour; that remains unqualified. No Zoom/attendee rooms are joined.


Configuration transfer uses a temporary global-admin-only app operation. A pinned
RSA3072 public key belongs only to this new EC2 node; its private key never leaves
the node. The Vercel server encrypts the four existing media/signing values using
AES256-GCM and wraps the session key with RSA-OAEP-SHA256. The browser downloads
only ciphertext, uploaded to the pinned host and opened there as root. The
private bootstrap key is removed on success. Bootstrap authorization expires
within 30 minutes and is disabled at cutover. Plaintext credentials are never
returned to the browser, assistant output, CloudShell or user-data.
