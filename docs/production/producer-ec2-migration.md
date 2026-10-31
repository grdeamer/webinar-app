# Producer engine EC2 migration — approval checkpoint

Prepared locally on October 31, 2026. No paid resource launched and no new
Vercel deployment performed. Website stays on Vercel; LiveKit remains transport.
This is one producer room, not the historical ten-room satellite migration.
The app can select EC2 explicitly and must not fall back to Sandbox.

## Verified cost proposal

Authenticated AWS Pricing returned SKU D23DFG4YVGYMSX7G: Linux shared
On-Demand c7i.2xlarge in us-east-1 is $0.357/hour (8 vCPU, 16 GiB).
Thirty running minutes cost $0.1785 compute. AWS confirmed gp3 at
$0.08/GB-month: 30 GB costs $2.40/month. A retained public IPv4 costs
$0.005/hour, about $3.65/730-hour month, even while stopped. Together
retained disk and address are about $6.05/month, excluding tax. There is no
EC2 compute charge while stopped. No ALB, NAT Gateway, Reserved Instance
or Savings Plan commitment is proposed.

Internet egress and LiveKit remain additional metered costs. Vercel website
and existing plan subscriptions remain separate. Setup proposal: up to $5
with an independently verified two-hour stop; normal manually started sessions
retain the approved $5 envelope and a 30-minute independent AWS stop. Runtime
traffic guard and guest deadline provide additional bounds; this is not a
provider-level invoice guarantee. End setup with the instance stopped.

Read-only AWS inventory: zero EC2 instances, approved Standard On-Demand
quota 32 vCPUs. Existing Lightsail jupiter-zoom-test is still running on
small_3_0 ($12/month). It is the separate Io receiver; this producer migration
does not silently delete it or claim that expense has ended.

## Prepared behavior and checks

Cloud schedule creation and verification precede EC2 StartInstances. Failure
prevents paid starts; ambiguous starts request Stop while preserving the
original shutdown. Repeated starts/restarts do not extend it. A guest timer
provides a second 30-minute bound, with 20-minute media expiry and no automatic
service restart. Manual Stop works even if the media HTTP endpoint fails.
Current profile binds to the authorized event/session; new events require
explicit reconfiguration. All media runtime state and browser profiles use
RAM-backed /run; swap/core dumps/recording disabled. No snapshots.

Local regression suite passed 329 tests, including shutdown order, failed
verification and non-extension. Typecheck and scoped lint passed. No EC2
performance, actual IAM, HTTPS, shutdown or hosted media qualification is
claimed until cost approval and real installation/testing. The new native
file publisher has not yet passed a hosted hour.

Deployment/security details and guest service artifacts are in
tools/production-ec2/README.md. IAM and network changes require explicit
approval for the prepared production-only scope, and actual identifiers must
be verified before applying. Do not deploy or launch until costs are accepted.
