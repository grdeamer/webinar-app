import { execFileSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const sensitiveName = /(?:SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ROLE_KEY|ADMIN_KEY|ADMIN_API_SECRET|API_SECRET|RESEND_API_KEY|VERCEL_OIDC_TOKEN)$/i
const placeholder = /^(?:your[_ -]|replace[_ -]|example|placeholder|changeme|test(?:[_-]|$)|<|\$\{)/i

export function findSecrets(text) {
  const findings = []
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const assignment = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    const value = assignment?.[2].replace(/^["']|["']$/g, "").trim()
    if (assignment && sensitiveName.test(assignment[1]) && value && !placeholder.test(value)) {
      findings.push({ line: index + 1, reason: "nonempty credential assignment" })
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) {
      findings.push({ line: index + 1, reason: "private key" })
    }
    // Public anon JWTs are not secrets; service-role JWTs are.
    for (const match of line.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
      try {
        if (JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role") {
          findings.push({ line: index + 1, reason: "service-role JWT" })
        }
      } catch { /* Not a JWT. */ }
    }
    if (/\b(?:sb_secret_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/.test(line)) {
      findings.push({ line: index + 1, reason: "provider secret token" })
    }
  }
  return findings
}

function main() {
  const root = fileURLToPath(new URL("../", import.meta.url))
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean)
  const findings = []
  for (const file of new Set(files)) {
    const fullPath = path.join(root, file)
    if (!existsSync(fullPath)) continue
    const contents = readFileSync(fullPath)
    if (contents.includes(0)) continue
    for (const finding of findSecrets(contents.toString("utf8"))) {
      findings.push(`${file}:${finding.line}: ${finding.reason}`)
    }
  }
  if (findings.length) {
    console.error("Credential check failed (values redacted):\n" + findings.join("\n"))
    process.exitCode = 1
  } else {
    console.log("Credential check passed for tracked and non-ignored working files.")
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
