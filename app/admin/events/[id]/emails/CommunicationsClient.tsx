"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, CheckCircle2, Mail, Send, TestTube2, Users } from "lucide-react"

type Campaign = "confirmations" | "presenters"
type Result = { sent: number; failed: number; test: boolean }
type CampaignHistory = { id: string; campaign_type: string; mode: string; status: string; recipient_count: number; accepted_count: number; failed_count: number; created_at: string }

export default function CommunicationsClient({
  eventId,
  eventTitle,
  counts,
  history,
}: {
  eventId: string
  eventTitle: string
  counts: { everyone: number; sendable: number; presenters: number; presentersMissingSessions: number; missingEmails: number }
  history: CampaignHistory[]
}) {
  const [campaign, setCampaign] = useState<Campaign>("confirmations")
  const [testEmail, setTestEmail] = useState("")
  const [busy, setBusy] = useState<"test" | "send" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const recipientCount = campaign === "confirmations" ? counts.sendable : counts.presenters
  const endpoint = campaign === "confirmations" ? "send-confirmations" : "send-presenter-links"
  const campaignName = campaign === "confirmations" ? "Attendee Confirmation" : "Presenter Access"

  async function run(mode: "test" | "send") {
    if (mode === "test" && !testEmail.includes("@")) {
      setError("Enter an email address for the test message.")
      return
    }
    if (mode === "send" && !window.confirm(`Send ${campaignName} to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}?`)) return

    setBusy(mode)
    setError(null)
    setResult(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/emails/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(mode === "test" ? { testTo: testEmail } : {}), requestKey: crypto.randomUUID() }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Send failed")
      setResult({ sent: Number(payload.sent || 0), failed: Number(payload.failed || 0), test: mode === "test" })
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Send failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5 text-white">
      <section className="border-b border-[#33405a] pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="editorial-eyebrow">Event &nbsp;/&nbsp; Communications</div><h1 className="mt-6 text-5xl font-medium tracking-[-.045em]">Reach the room.</h1><p className="mt-3 text-base text-white/55">Review audiences, test messages, and send communications for {eventTitle}.</p></div>
          <Link href={`/admin/events/${eventId}/attendees`} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-4 py-2.5 text-sm font-semibold hover:bg-white/10"><Users size={16} />Manage People</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Sendable recipients" value={counts.sendable} state="ready" />
        <Metric label="Presenters" value={counts.presenters} state="ready" />
        <Metric label="Missing assignments" value={counts.presentersMissingSessions} state={counts.presentersMissingSessions ? "warning" : "ready"} />
        <Metric label="Missing email" value={counts.missingEmails} state={counts.missingEmails ? "warning" : "ready"} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[.16em] text-white/35">1 · Choose message</div>
          <div className="mt-4 space-y-3">
            <CampaignButton active={campaign === "confirmations"} title="Attendee Confirmation" detail={`${counts.sendable} unique, valid email addresses`} onClick={() => { setCampaign("confirmations"); setResult(null); setError(null) }} />
            <CampaignButton active={campaign === "presenters"} title="Presenter Access" detail={`${counts.presenters} presenters`} onClick={() => { setCampaign("presenters"); setResult(null); setError(null) }} />
          </div>
          <div className="mt-5 rounded-xl border border-white/[.07] bg-black/15 p-4"><div className="text-xs font-semibold text-white/45">Audience source</div><div className="mt-2 text-sm text-white/70">The recipient list comes directly from People. Roles and session assignments are never duplicated here.</div><Link href={`/admin/events/${eventId}/attendees`} className="mt-3 inline-block text-xs font-semibold text-sky-200/75">Review people →</Link></div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[.16em] text-white/35">2 · Review and send</div><h2 className="mt-2 text-xl font-semibold">{campaignName}</h2><p className="mt-1 text-sm text-white/45">{recipientCount} eligible recipient{recipientCount === 1 ? "" : "s"}</p></div><span className="rounded-full border border-sky-300/15 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">{campaign === "confirmations" ? "Audience" : "Talent"}</span></div>

          {campaign === "presenters" && counts.presentersMissingSessions > 0 ? <div className="mt-5 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><div><div className="font-semibold">{counts.presentersMissingSessions} presenter{counts.presentersMissingSessions === 1 ? " is" : "s are"} missing session access.</div><div className="mt-1 text-amber-100/65">Assign sessions in People before sending access links.</div></div></div> : null}

          <div className="mt-5 rounded-2xl border border-white/[.07] bg-black/15 p-4"><label className="text-xs font-semibold text-white/50">Send a test first<div className="mt-2 flex flex-col gap-2 sm:flex-row"><input aria-label="Test recipient email" type="email" placeholder="you@company.com" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none" /><button type="button" disabled={busy !== null || recipientCount === 0} onClick={() => void run("test")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 disabled:opacity-35"><TestTube2 size={15} />{busy === "test" ? "Sending…" : "Send Test"}</button></div></label></div>

          <button type="button" disabled={busy !== null || recipientCount === 0 || (campaign === "presenters" && counts.presentersMissingSessions > 0)} onClick={() => void run("send")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"><Send size={16} />{busy === "send" ? "Sending…" : `Send to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}</button>
          {campaign === "presenters" && counts.presentersMissingSessions > 0 ? <p className="mt-2 text-center text-xs text-white/35">Resolve missing presenter assignments to enable the production send.</p> : null}
          {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          {result ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"><CheckCircle2 size={17} />{result.test ? "Test accepted by Resend." : `${result.sent} accepted by Resend${result.failed ? `, ${result.failed} rejected` : ""}.`}</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-white/35">Recent sends</div>
        <div className="mt-3 divide-y divide-white/[.07]">
          {history.map((item) => <div key={item.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><div><div className="font-medium">{item.campaign_type === "confirmation" ? "Attendee Confirmation" : "Presenter Access"}</div><div className="text-xs text-white/40">{new Date(item.created_at).toLocaleString()} · {item.mode}</div></div><div className="text-white/55">{item.recipient_count} recipients</div><div className="text-emerald-200/75">{item.accepted_count} accepted</div><div className={item.failed_count ? "text-red-200" : "text-white/45"}>{item.failed_count} failed</div></div>)}
          {history.length === 0 ? <div className="py-4 text-sm text-white/40">No recorded sends yet.</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-3"><Mail className="text-white/40" size={18} /><div><div className="text-sm font-semibold">Clear operator split</div><div className="mt-1 text-xs text-white/45">Manage individuals in People. Use Communications only for audience review, testing, and bulk sends.</div></div></div></section>
    </div>
  )
}

function Metric({ label, value, state }: { label: string; value: number; state: "ready" | "warning" }) {
  return <div className={`rounded-2xl border p-4 ${state === "warning" ? "border-amber-300/15 bg-amber-500/[.07]" : "border-white/10 bg-white/[.035]"}`}><div className="text-xs text-white/40">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>
}

function CampaignButton({ active, title, detail, onClick }: { active: boolean; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-violet-300/30 bg-violet-500/10" : "border-white/[.07] bg-black/15 hover:bg-white/[.05]"}`}><div className="font-semibold">{title}</div><div className="mt-1 text-xs text-white/45">{detail}</div></button>
}
