import { Resend } from "resend"

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  return new Resend(apiKey)
}

export function getEmailFrom(): string {
  const configured = String(process.env.EMAIL_FROM || "")
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim()

  return configured || "Jupiter Events <events@jupiter.events>"
}

export function getAppUrl(): string {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  if (configured && !(process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(configured))) {
    return configured
  }
  return process.env.NODE_ENV === "production" ? "https://app.jupiter.events" : "http://localhost:3000"
}

export function resendErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message || "Resend rejected the email")
  }
  return "Resend rejected the email"
}
