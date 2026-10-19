import "server-only"
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2"
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand, GetScheduleCommand } from "@aws-sdk/client-scheduler"
import { ioAwsCredentials, ioAwsRegion } from "./aws"
import { broadcastDuration, scheduledStop, shutdownTime } from "./runtime-options"

function configuration() {
  return { id: process.env.JUPITER_IO_EC2_INSTANCE_ID, group: process.env.JUPITER_IO_SCHEDULER_GROUP, stopRole: process.env.JUPITER_IO_STOP_ROLE_ARN }
}
export function ec2RuntimeConfigured() { const c = configuration(); return Boolean(c.id && c.group && c.stopRole && process.env.JUPITER_IO_FIREWALL_ROLE_ARN) }
async function clients() {
  const c = configuration()
  if (!ec2RuntimeConfigured() || !c.id || !c.group || !c.stopRole || !/^i-[0-9a-f]+$/.test(c.id)) throw new Error("Broadcast server is not configured.")
  const options = { region: ioAwsRegion(), maxAttempts: 2, credentials: await ioAwsCredentials() }
  return { ...c, id: c.id, group: c.group, stopRole: c.stopRole, name: `shutdown-${c.id}`, ec2: new EC2Client(options), scheduler: new SchedulerClient(options) }
}
function missing(cause: unknown) { return cause instanceof Error && cause.name === "ResourceNotFoundException" }
export async function runtimeStatus() {
  if (!ec2RuntimeConfigured()) return { configured: false as const }
  const c = await clients()
  const result = await c.ec2.send(new DescribeInstancesCommand({ InstanceIds: [c.id] }))
  const instance = result.Reservations?.flatMap(r => r.Instances ?? [])[0]
  if (!instance) throw new Error("Broadcast server was not found.")
  let stopAt: string | null = null
  try { stopAt = scheduledStop((await c.scheduler.send(new GetScheduleCommand({ Name: c.name, GroupName: c.group }))).ScheduleExpression) }
  catch (cause) { if (!missing(cause)) throw cause }
  return { configured: true as const, state: instance.State?.Name || "unknown", stopAt, capacity: 10, capacityValidated: false, hourlyComputeUsd: 1.428 }
}
export async function startRuntime(value: unknown, prepare: () => Promise<void>) {
  const minutes = broadcastDuration(value), c = await clients()
  const current = await runtimeStatus()
  if (!current.configured) throw new Error("Broadcast server is not configured.")
  if (current.state === "running" || current.state === "pending") return current
  if (current.state !== "stopped") throw new Error("Wait for the server to finish stopping before starting it.")
  // CreateSchedule is the start lock. Do not replace another recent start request.
  try {
    const old = await c.scheduler.send(new GetScheduleCommand({ Name: c.name, GroupName: c.group }))
    if (!old.LastModificationDate || Date.now() - old.LastModificationDate.getTime() < 60000) throw new Error("A server start is already being prepared. Refresh status shortly.")
    await c.scheduler.send(new DeleteScheduleCommand({ Name: c.name, GroupName: c.group }))
  } catch (cause) { if (!missing(cause)) throw cause }
  await c.scheduler.send(new CreateScheduleCommand({ Name: c.name, GroupName: c.group, ScheduleExpression: `at(${shutdownTime(minutes)})`, ScheduleExpressionTimezone: "UTC", FlexibleTimeWindow: { Mode: "OFF" }, ActionAfterCompletion: "DELETE", State: "ENABLED", Target: { Arn: "arn:aws:scheduler:::aws-sdk:ec2:stopInstances", RoleArn: c.stopRole, Input: JSON.stringify({ InstanceIds: [c.id] }), RetryPolicy: { MaximumEventAgeInSeconds: 3600, MaximumRetryAttempts: 10 } } }))
  // Every new session requires fresh operator connections; saved media settings stay intact.
  await prepare()
  // Keep the stop schedule even if AWS times out: a start may have succeeded remotely.
  await c.ec2.send(new StartInstancesCommand({ InstanceIds: [c.id] }))
  return runtimeStatus()
}
export async function stopRuntime() {
  const c = await clients()
  await c.ec2.send(new StopInstancesCommand({ InstanceIds: [c.id] }))
  // Preserve the cloud-side deadline until stopping is confirmed, including on retries.
  return runtimeStatus()
}
