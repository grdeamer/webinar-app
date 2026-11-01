import "server-only"
import { fromWebToken } from "@aws-sdk/credential-providers"
import { getVercelOidcToken } from "@vercel/oidc"

export async function ioAwsCredentials() {
  const roleArn = process.env.JUPITER_IO_FIREWALL_ROLE_ARN
  if (!roleArn) throw new Error("Io AWS access is not configured.")
  return fromWebToken({ roleArn, webIdentityToken: await getVercelOidcToken(), roleSessionName: "jupiter-io" })
}
export function ioAwsRegion() { return process.env.JUPITER_IO_AWS_REGION || "us-east-1" }
