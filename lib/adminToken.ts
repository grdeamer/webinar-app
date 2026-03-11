import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const COOKIE_NAME = "admin_token"
const ONE_DAY_SECONDS = 60 * 60 * 24
const THIRTY_DAYS_SECONDS = ONE_DAY_SECONDS * 30

function getSecret() {
  const secret =
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_KEY ||
    ""

  if (!secret) {
    throw new Error(
      "Missing ADMIN_TOKEN_SECRET (or ADMIN_PASSWORD / ADMIN_KEY) environment variable"
    )
  }

  return secret
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex")
}

function encodePayload(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function decodePayload(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}

function buildToken(payload: Record<string, unknown>) {
  const encoded = encodePayload(payload)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

function parseToken(token: string | null | undefined) {
  if (!token || typeof token !== "string") return null

  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null

  const encoded = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  const expected = sign(encoded)
  if (!safeEqual(signature, expected)) return null

  const payload = decodePayload(encoded)
  if (!payload) return null

  const exp = typeof payload.exp === "number" ? payload.exp : 0
  if (!exp || Date.now() >= exp) return null

  return payload
}

export function getAdminCookieName() {
  return COOKIE_NAME
}

export function createAdminTokenPayload(extra?: Record<string, unknown>) {
  return {
    role: "admin",
    iat: Date.now(),
    exp: Date.now() + THIRTY_DAYS_SECONDS * 1000,
    ...(extra || {}),
  }
}

export function createAdminToken(extra?: Record<string, unknown>) {
  return buildToken(createAdminTokenPayload(extra))
}

export function verifyAdminToken(token: string | null | undefined) {
  const payload = parseToken(token)
  return !!payload && payload.role === "admin"
}

export function decodeAdminToken(token: string | null | undefined) {
  return parseToken(token)
}

export async function readAdminTokenCookie() {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

export async function getAdminTokenFromCookies() {
  return readAdminTokenCookie()
}

export async function hasValidAdminToken() {
  const token = await readAdminTokenCookie()
  return verifyAdminToken(token)
}

export async function requireValidAdminToken() {
  const ok = await hasValidAdminToken()
  if (!ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { ok: true as const }
}

export async function setAdminTokenCookie(
  response: NextResponse,
  extra?: Record<string, unknown>
) {
  const token = createAdminToken(extra)

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  })

  return response
}

export async function clearAdminTokenCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}

export const ADMIN_TOKEN_COOKIE_NAME = COOKIE_NAME
export const makeAdminToken = createAdminToken
export const isValidAdminToken = verifyAdminToken
export const getAdminToken = getAdminTokenFromCookies
export const requireAdminToken = requireValidAdminToken
export const setAdminCookie = setAdminTokenCookie
export const clearAdminCookie = clearAdminTokenCookie