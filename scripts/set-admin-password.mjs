import fs from "fs"
import path from "path"
import bcrypt from "bcryptjs"

const projectRoot = process.cwd()
const envPath = path.join(projectRoot, ".env.local")

const password = process.argv[2]
if (!password) {
  console.error("Usage: node scripts/set-admin-password.mjs <password>")
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)
const b64 = Buffer.from(hash, "utf8").toString("base64")

// Read existing .env.local (if any)
let text = ""
if (fs.existsSync(envPath)) text = fs.readFileSync(envPath, "utf8")

let lines = text.split(/\r?\n/)

// Remove any existing ADMIN_PASSWORD / ADMIN_PASSWORD_B64 lines (and keep other lines intact)
lines = lines.filter(
  (l) =>
    l.trim() !== "" &&
    !l.startsWith("ADMIN_PASSWORD=") &&
    !l.startsWith("ADMIN_PASSWORD_B64=")
)

// Write base64 version (fool-proof for .env parsing)
lines.push(`ADMIN_PASSWORD_B64=${b64}`)

// Ensure JWT_SECRET exists (your route requires it)
if (!lines.some((l) => l.startsWith("JWT_SECRET="))) {
  lines.push(`JWT_SECRET=dev-secret-change-me`)
}

fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8")

console.log("✅ Updated .env.local")
console.log("ADMIN_PASSWORD_B64 written. Decoded prefix:", hash.slice(0, 4), "len:", hash.length)
console.log("Login with exactly:", password)