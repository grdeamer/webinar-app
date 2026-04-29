import { Resend } from "resend"

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  return new Resend(apiKey)
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Jupiter Events <onboarding@resend.dev>"
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}