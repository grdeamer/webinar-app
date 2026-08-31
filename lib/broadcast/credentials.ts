import "server-only"

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const algorithm = "aes-256-gcm"
const version = "v1"

function credentialKey(): Buffer {
  const encoded = process.env.BROADCAST_CREDENTIALS_KEY?.trim()
  if (!encoded) {
    throw new Error("Broadcast credential encryption is not configured. Add BROADCAST_CREDENTIALS_KEY as a base64-encoded 32-byte key.")
  }

  const key = Buffer.from(encoded, "base64")
  if (key.length !== 32) {
    throw new Error("BROADCAST_CREDENTIALS_KEY must decode to exactly 32 bytes.")
  }
  return key
}

export function isBroadcastEncryptionConfigured(): boolean {
  try {
    credentialKey()
    return true
  } catch {
    return false
  }
}

export function encryptBroadcastSecret(secret: string): string {
  const value = secret.trim()
  if (!value) throw new Error("A stream key is required.")

  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, credentialKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [version, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":")
}

export function decryptBroadcastSecret(sealed: string): string {
  const [sealedVersion, ivValue, tagValue, ciphertextValue] = sealed.split(":")
  if (sealedVersion !== version || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Stored broadcast credentials use an unsupported format.")
  }

  const decipher = createDecipheriv(algorithm, credentialKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function maskStreamKey(secret: string): string {
  const value = secret.trim()
  if (value.length <= 4) return "••••••••"
  return `••••••••${value.slice(-4)}`
}
