import "server-only"
import { LightsailClient, GetInstancePortStatesCommand, OpenInstancePublicPortsCommand } from "@aws-sdk/client-lightsail"
import { fromWebToken } from "@aws-sdk/credential-providers"
import { getVercelOidcToken } from "@vercel/oidc"
import { publicIpv4 } from "./public-ip"

export const INGEST_PORT = 9000
function configuration() {
  return { roleArn: process.env.JUPITER_IO_FIREWALL_ROLE_ARN, instanceName: process.env.JUPITER_IO_LIGHTSAIL_INSTANCE, region: process.env.JUPITER_IO_AWS_REGION || "us-east-1" }
}
export function firewallConfigured() {
  const config = configuration()
  return Boolean(config.roleArn && config.instanceName)
}
async function client() {
  const config = configuration()
  if (!config.roleArn || !config.instanceName) throw new Error("Firewall integration is not configured.")
  return { instanceName: config.instanceName, sdk: new LightsailClient({ region: config.region, maxAttempts: 2, credentials: fromWebToken({ roleArn: config.roleArn, webIdentityToken: await getVercelOidcToken(), roleSessionName: "jupiter-io-firewall" }) }) }
}
export async function encoderAddresses() {
  const { sdk, instanceName } = await client()
  const { portStates = [] } = await sdk.send(new GetInstancePortStatesCommand({ instanceName }))
  const rule = portStates.find(rule => rule.protocol === "udp" && rule.fromPort === INGEST_PORT && rule.toPort === INGEST_PORT)
  return rule?.cidrs ?? []
}
export async function allowEncoder(value: unknown) {
  const ip = publicIpv4(value)
  const { sdk, instanceName } = await client()
  const { portStates = [] } = await sdk.send(new GetInstancePortStatesCommand({ instanceName }))
  const rule = portStates.find(rule => rule.protocol === "udp" && rule.fromPort === INGEST_PORT && rule.toPort === INGEST_PORT)
  if (rule?.cidrs?.includes(`${ip}/32`)) return ip
  if ((rule?.cidrs?.length ?? 0) >= 50) throw new Error("Encoder allowlist capacity reached.")
  // Never use PutInstancePublicPorts: it replaces the entire instance firewall.
  await sdk.send(new OpenInstancePublicPortsCommand({ instanceName, portInfo: { protocol: "udp", fromPort: INGEST_PORT, toPort: INGEST_PORT, cidrs: [...new Set([...(rule?.cidrs ?? []), `${ip}/32`])], ipv6Cidrs: rule?.ipv6Cidrs, cidrListAliases: rule?.cidrListAliases } }))
  return ip
}
