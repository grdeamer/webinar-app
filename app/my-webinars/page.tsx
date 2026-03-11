import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import jwt from "jsonwebtoken"
import AttendeePresenceHeartbeat from "@/components/AttendeePresenceHeartbeat"
import { supabaseAdmin } from "@/lib/supabase/admin"
import MyWebinarsClient, { type WebinarUIRow } from "@/components/MyWebinarsClient"
import type { Material } from "@/components/ClassMaterialsBubble"
import type { WebinarAssignmentRow } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UserTokenPayload = {
  userId?: string
}

type WebinarRow = {
  id: string
  title: string
  description: string | null
  webinar_date: string | null
  join_link: string | null
  tag: string | null
  agenda_pdf_url: string | null
  materials: Material[] | null
}

function formatDatePretty(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function isUpcoming(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  return d.getTime() >= Date.now()
}

function tagBadge(tag: string | null, iso: string | null) {
  const t = (tag || "").trim().toLowerCase()

  if (t === "live") {
    return { label: "LIVE", cls: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30" }
  }

  if (t === "on-demand" || t === "ondemand") {
    return {
      label: "ON-DEMAND",
      cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
    }
  }

  if (t === "upcoming") {
    return { label: "UPCOMING", cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30" }
  }

  if (isUpcoming(iso)) {
    return { label: "UPCOMING", cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30" }
  }

  return {
    label: "ON-DEMAND",
    cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  }
}

async function toSignedUrl(maybeStorageUrl: string | null, expiresIn = 60 * 60) {
  if (!maybeStorageUrl) return null
  if (!maybeStorageUrl.startsWith("storage:")) return maybeStorageUrl

  const raw = maybeStorageUrl.replace("storage:", "")
  const firstSlash = raw.indexOf("/")
  if (firstSlash === -1) return null

  const bucket = raw.slice(0, firstSlash)
  const path = raw.slice(firstSlash + 1)

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

function normalizeWebinarRow(row: WebinarAssignmentRow): WebinarRow | null {
  const webinar = Array.isArray((row as any).webinars)
    ? ((row as any).webinars[0] ?? null)
    : row.webinars

  if (!webinar) return null

  return {
    id: String(webinar.id),
    title: String(webinar.title ?? ""),
    description: webinar.description ?? null,
    webinar_date: webinar.webinar_date ?? null,
    join_link: webinar.join_link ?? null,
    tag: webinar.tag ?? null,
    agenda_pdf_url: webinar.agenda_pdf_url ?? null,
    materials: (webinar.materials ?? null) as Material[] | null,
  }
}

export default async function MyWebinarsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("user_token")?.value
  if (!token) redirect("/")

  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <AttendeePresenceHeartbeat />
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold">Server misconfigured</h1>
            <p className="mt-2 text-white/70">Missing JWT_SECRET in environment.</p>
          </div>
        </div>
      </main>
    )
  }

  let userId: string | null = null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload
    userId = decoded.userId ?? null
  } catch {
    redirect("/")
  }
  if (!userId) redirect("/")

  const { data, error } = await supabaseAdmin
    .from("user_webinars")
    .select(
      `
      webinar_id,
      webinars:webinar_id (
        id,
        title,
        description,
        webinar_date,
        join_link,
        tag,
        agenda_pdf_url,
        materials
      )
    `
    )
    .eq("user_id", userId)

  if (error) {
    console.error("my-webinars query error:", error)
  }

  const assignments = (data ?? []) as unknown as WebinarAssignmentRow[]
  const rawRows = assignments.map(normalizeWebinarRow).filter((row): row is WebinarRow => Boolean(row))

  const assignmentsCount = assignments.length
  const webinarsCount = rawRows.length

  rawRows.sort((a, b) => {
    const ta = a.webinar_date ? new Date(a.webinar_date).getTime() : Number.POSITIVE_INFINITY
    const tb = b.webinar_date ? new Date(b.webinar_date).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  })

  const rows: WebinarUIRow[] = await Promise.all(
    rawRows.map(async (w) => {
      const agendaSigned = await toSignedUrl(w.agenda_pdf_url)
      const materialsSigned: Material[] = await Promise.all(
        (w.materials ?? []).map(async (m) => ({
          ...m,
          url: (await toSignedUrl(m.url)) ?? m.url,
        }))
      )

      return {
        ...w,
        agenda_pdf_url: agendaSigned,
        materials: materialsSigned,
        _datePretty: formatDatePretty(w.webinar_date),
        _badge: tagBadge(w.tag, w.webinar_date),
      }
    })
  )

  const showNoAssigned = assignmentsCount === 0
  const showMissingWebinars = assignmentsCount > 0 && webinarsCount === 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <AttendeePresenceHeartbeat />

      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Event Lobby</h1>
            <p className="mt-1 text-white/60">Your assigned sessions, sorted by date/time.</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/webinars"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Public List
            </a>
            <a
              href="/access"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
            >
              Change Email
            </a>
          </div>
        </div>

        {(showNoAssigned || showMissingWebinars) && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-xl font-semibold">
              {showNoAssigned ? "No webinars assigned" : "No webinars found"}
            </h2>
            <p className="mt-2 text-white/60">
              {showNoAssigned
                ? "If you think this is a mistake, contact the admin."
                : "Assignments exist, but the referenced webinars weren’t found."}
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/access"
                className="rounded-xl bg-indigo-600 px-5 py-3 font-medium hover:bg-indigo-700 transition"
              >
                Re-enter email →
              </a>
              <a
                href="/webinars"
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium hover:bg-white/10 transition"
              >
                Browse public list
              </a>
            </div>
          </div>
        )}

        {rows.length > 0 ? <MyWebinarsClient webinars={rows} /> : null}
      </div>
    </main>
  )
}