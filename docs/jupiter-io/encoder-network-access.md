# Encoder network access

The admin-only Manage ingest panel detects the browser's public IPv4 using Vercel's client IP header. Detection never changes the firewall. A manual field supports OBS/Telescope on another computer. Mac Terminal and Windows curl.exe instructions are included.

Allow encoder IP requires an explicit review/confirmation. The server rejects private/reserved addresses, CIDRs, URLs, IPv6, and cross-origin writes. Its AWS target is server configuration; clients cannot select an instance, protocol, or port. It opens only one IPv4 /32 on UDP 9000, preserving existing source entries and other ports. Existing allowed addresses return without changing the rule. The AWS operation is followed by a status read; the UI distinguishes confirmed access from an unconfirmed update. Actor/IP changes are logged without connection passphrases or media.

Production configuration:
- `JUPITER_IO_FIREWALL_ROLE_ARN`
- `JUPITER_IO_LIGHTSAIL_INSTANCE`
- `JUPITER_IO_AWS_REGION`

AWS access uses Vercel OIDC and temporary STS credentials, not access keys. The role trusts only the webinar-app-lerb production project in gary-deamers-projects. Preview/local deployments do not receive the role configuration.

AWS does not support resource-level scoping for GetInstancePortStates. The approved policy therefore permits this read in us-east-1; OpenInstancePublicPorts is scoped to the Io instance ARN. AWS IAM cannot restrict that action to port 9000, so the application enforces this fixed port. No PutInstancePublicPorts, SSH, instance lifecycle, storage, or media privileges are granted. See firewall-role-policy.json for the exact permissions.

Browser detection can show an IPv6-only address or a proxy/VPN address. If public IPv4 detection fails, use the command on the actual encoder. This is network access setup, not proof that OBS is sending or that satellites are publishing.
