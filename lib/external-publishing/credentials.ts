import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

type EncryptedSecret = {
  ciphertext: string
  iv: string
  tag: string
}

function deriveEncryptionKey(raw: string): Buffer {
  const decoded = Buffer.from(raw, "base64")
  if (decoded.length === 32) return decoded

  return createHash("sha256")
    .update("jupiter:external-publishing:v1\0", "utf8")
    .update(raw, "utf8")
    .digest()
}

function getEncryptionKeys(): Buffer[] {
  const configured = process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY?.trim()
  const legacy = process.env.JWT_SECRET?.trim()
  const rawKeys = [configured, legacy].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  )

  if (rawKeys.length === 0) {
    throw new Error("Publishing credential encryption is not configured")
  }

  return rawKeys.map(deriveEncryptionKey)
}

function getEncryptionKey(): Buffer {
  const [key] = getEncryptionKeys()
  return key
}

export function encryptPublishingSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  }
}

export function decryptPublishingSecret(secret: EncryptedSecret): string {
  for (const key of getEncryptionKeys()) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(secret.iv, "base64"),
      )
      decipher.setAuthTag(Buffer.from(secret.tag, "base64"))
      return Buffer.concat([
        decipher.update(Buffer.from(secret.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8")
    } catch {
      // Try the legacy JWT-derived key for credentials saved before the
      // dedicated publishing key was introduced.
    }
  }

  throw new Error("Unable to decrypt publishing credentials")
}
