import Link from "next/link"
import { ReactNode } from "react"
import { getEventBySlug } from "@/lib/events"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventLiveStateRedirect from "@/components/EventLiveStateRedirect"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventLayout(props: { params: Promise<{ slug: string }>; children: ReactNode }) {
  const { slug } = await props.params

  const event = await getEventBySlug(slug)
  const authed = await getEventUserOrNull({ slug })

  const { data: theme } = await supabaseAdmin
    .from("event_page_themes")
    .select(
      "bg_color,text_color,background_image_url,overlay_opacity,brand_logo_url,brand_logo_position"
    )
    .eq("event_id", event.id)
    .eq("page_key", "event_landing")
    .maybeSingle()

  const pageStyle = theme?.background_image_url
    ? {
        backgroundColor: theme.bg_color || "#020617",
        color: theme.text_color || "#ffffff",
        backgroundImage: `linear-gradient(rgba(2,6,23,${
          (theme.overlay_opacity ?? 45) / 100
        }), rgba(2,6,23,${
          (theme.overlay_opacity ?? 45) / 100
        })), url(${theme.background_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: theme?.bg_color || "#020617",
        color: theme?.text_color || "#ffffff",
      }

  return (
    <div className="min-h-screen text-white" style={pageStyle}>
      <EventLiveStateRedirect slug={slug} />

      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Event portal
            </div>
            <div className="mt-1 text-xl font-bold">{event.title}</div>
          </div>

          <div className="flex items-center gap-3">
            {authed ? (
              <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 sm:block">
                Signed in as {(authed.user as any).email}
              </div>
            ) : (
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55 sm:block">
                Guest preview
              </div>
            )}

            <Link href="/events" className="text-sm text-white/70 hover:text-white">
              All events →
            </Link>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 pb-4 text-sm">
          <Nav href={`/events/${slug}`} label="Home" />
          <Nav href={`/events/${slug}/lobby`} label="Lobby" />
          <Nav href={`/events/${slug}/agenda`} label="Agenda" />
          <Nav href={`/events/${slug}/sessions`} label="Sessions" />
          <Nav href={`/events/${slug}/breakouts`} label="Breakouts" />
          <Nav href={`/events/${slug}/sponsors`} label="Sponsors" />
          <Nav href={`/events/${slug}/chat`} label="Chat" />
          <Nav href={`/events/${slug}/networking`} label="Networking" />
          <Nav href={`/events/${slug}/library`} label="On-demand" />
        </nav>
      </header>

      {theme?.brand_logo_url && (
        <div
          className={`mx-auto mt-6 flex max-w-6xl px-6 ${
            theme.brand_logo_position === "center"
              ? "justify-center"
              : theme.brand_logo_position === "right"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <img
            src={theme.brand_logo_url}
            alt="Event logo"
            className="h-14 w-auto max-w-[220px]"
          />
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-8">{props.children}</main>
    </div>
  )
}

function Nav({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
    >
      {label}
    </Link>
  )
}