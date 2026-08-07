import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

type EncryptedSecret = {
  ciphertext: string
  iv: string
  tag: string
}

function getEncryptionKey(): Buffer {
  const raw =
    process.env.EXTERNAL_PUBLISHING_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim()
  if (!raw) {
    throw new Error("Publishing credential encryption is not configured")
  }

  const decoded = Buffer.from(raw, "base64")
  if (decoded.length === 32) return decoded

  return createHash("sha256")
    .update("jupiter:external-publishing:v1\0", "utf8")
    .update(raw, "utf8")
    .digest()
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
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(secret.iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
