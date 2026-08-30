"use client"

import Link from "next/link"
import { type ReactNode, useState } from "react"
import { AlertTriangle, ArrowUpRight, CheckCircle2, KeyRound, Mail, Send, TestTube2, UsersRound } from "lucide-react"

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
    <div className="mx-auto max-w-[1280px] space-y-4 text-white">
      <section className="flex flex-col gap-5 border-b border-[#273348] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="editorial-eyebrow">Event operations &nbsp;/&nbsp; Message center</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em]">Prepare the next send</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">Choose an audience, verify access, and test every message before it reaches {eventTitle}.</p>
        </div>
        <Link href={`/admin/events/${eventId}/attendees`} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-sm font-semibold text-white/72 transition hover:border-white/20 hover:bg-white/[.07] hover:text-white">Manage recipients<ArrowUpRight size={15} /></Link>
      </section>

      <section className="grid overflow-hidden rounded-2xl border border-[#202b3d] bg-[#070c16] sm:grid-cols-3 sm:divide-x sm:divide-[#202b3d]">
        <Metric label="Sendable recipients" value={counts.sendable} state="ready" />
        <Metric label="Missing assignments" value={counts.presentersMissingSessions} state={counts.presentersMissingSessions ? "warning" : "ready"} />
        <Metric label="Missing email" value={counts.missingEmails} state={counts.missingEmails ? "warning" : "ready"} />
      </section>

      <section id="message-center" className="scroll-mt-8 grid overflow-hidden rounded-2xl border border-[#202b3d] bg-[#070c16] lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-[#202b3d] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/10 text-xs font-semibold text-violet-100">1</span>
            <div><div className="text-sm font-semibold">Choose message</div><div className="mt-0.5 text-xs text-white/38">Select the delivery workflow</div></div>
          </div>
          <div className="mt-5 space-y-2.5">
            <CampaignButton icon={<Mail size={17} />} active={campaign === "confirmations"} title="Attendee confirmation" detail={`${counts.sendable} eligible addresses`} onClick={() => { setCampaign("confirmations"); setResult(null); setError(null) }} />
            <CampaignButton icon={<KeyRound size={17} />} active={campaign === "presenters"} title="Presenter access" detail={`${counts.presenters} presenters`} onClick={() => { setCampaign("presenters"); setResult(null); setError(null) }} />
          </div>
          <div className="mt-5 border-t border-white/[.07] pt-4"><div className="flex items-center gap-2 text-xs font-semibold text-white/48"><UsersRound size={14} />Recipient source</div><p className="mt-2 text-xs leading-5 text-white/40">Pulled directly from People. Roles and session assignments stay in one source of truth.</p></div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-300/20 bg-sky-400/10 text-xs font-semibold text-sky-100">2</span><div><div className="text-xs font-semibold uppercase tracking-[.15em] text-white/34">Review and send</div><h2 className="mt-1.5 text-xl font-semibold tracking-[-.02em]">{campaignName}</h2></div></div>
            <div className="text-right"><div className="text-2xl font-semibold tabular-nums">{recipientCount}</div><div className="mt-0.5 text-xs text-white/40">eligible recipient{recipientCount === 1 ? "" : "s"}</div></div>
          </div>

          {campaign === "presenters" && counts.presentersMissingSessions > 0 ? <div className="mt-5 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><div><div className="font-semibold">{counts.presentersMissingSessions} presenter{counts.presentersMissingSessions === 1 ? " is" : "s are"} missing session access.</div><div className="mt-1 text-amber-100/65">Assign sessions in People before sending access links.</div></div></div> : null}

          {recipientCount === 0 ? <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-300/15 bg-sky-400/[.055] p-4"><UsersRound className="mt-0.5 shrink-0 text-sky-200/75" size={18} /><div><div className="text-sm font-semibold">No eligible recipients yet</div><p className="mt-1 text-xs leading-5 text-white/45">Add people with valid email addresses before testing or sending this message.</p><Link href={`/admin/events/${eventId}/attendees`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-200/80">Open People<ArrowUpRight size={13} /></Link></div></div> : null}

          <div className="mt-5 rounded-xl border border-white/[.07] bg-black/15 p-4"><label className="text-xs font-semibold text-white/50">Test delivery<div className="mt-2 flex flex-col gap-2 sm:flex-row"><input aria-label="Test recipient email" type="email" placeholder="you@company.com" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#040812] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/22 focus:border-sky-300/35" /><button type="button" disabled={busy !== null || recipientCount === 0} onClick={() => void run("test")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/18 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/18 disabled:cursor-not-allowed disabled:opacity-30"><TestTube2 size={15} />{busy === "test" ? "Sending…" : "Send test"}</button></div></label></div>

          <button type="button" disabled={busy !== null || recipientCount === 0 || (campaign === "presenters" && counts.presentersMissingSessions > 0)} onClick={() => void run("send")} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6750d3] px-5 py-3.5 text-sm font-semibold shadow-[0_10px_30px_rgba(103,80,211,.18)] transition hover:bg-[#765fe0] disabled:cursor-not-allowed disabled:bg-white/[.06] disabled:text-white/28 disabled:shadow-none"><Send size={16} />{busy === "send" ? "Sending…" : `Send to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`}</button>
          {campaign === "presenters" && counts.presentersMissingSessions > 0 ? <p className="mt-2 text-center text-xs text-white/35">Resolve missing presenter assignments to enable the production send.</p> : null}
          {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          {result ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"><CheckCircle2 size={17} />{result.test ? "Test accepted by Resend." : `${result.sent} accepted by Resend${result.failed ? `, ${result.failed} rejected` : ""}.`}</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#202b3d] bg-[#070c16] p-5">
        <div className="flex items-center justify-between gap-4"><div><div className="text-sm font-semibold">Recent sends</div><div className="mt-1 text-xs text-white/38">Delivery history for this event</div></div><Mail size={17} className="text-white/28" /></div>
        <div className="mt-4 divide-y divide-white/[.07]">
          {history.map((item) => <div key={item.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><div><div className="font-medium">{item.campaign_type === "confirmation" ? "Attendee Confirmation" : "Presenter Access"}</div><div className="text-xs text-white/40">{new Date(item.created_at).toLocaleString()} · {item.mode}</div></div><div className="text-white/55">{item.recipient_count} recipients</div><div className="text-emerald-200/75">{item.accepted_count} accepted</div><div className={item.failed_count ? "text-red-200" : "text-white/45"}>{item.failed_count} failed</div></div>)}
          {history.length === 0 ? <div className="rounded-xl border border-dashed border-white/[.08] px-4 py-5 text-sm text-white/38">No messages have been sent for this event.</div> : null}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, state }: { label: string; value: number; state: "ready" | "warning" }) {
  return <div className={`flex min-h-[78px] items-center justify-between gap-4 px-5 py-4 ${state === "warning" ? "bg-amber-500/[.045]" : ""}`}><div><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/36">{label}</div><div className={`mt-1 text-xs ${state === "warning" ? "text-amber-200/70" : "text-emerald-200/60"}`}>{state === "warning" ? "Action needed" : "Ready"}</div></div><div className="text-2xl font-semibold tabular-nums">{value}</div></div>
}

function CampaignButton({ active, icon, title, detail, onClick }: { active: boolean; icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-violet-300/32 bg-violet-500/[.12] shadow-[inset_0_1px_rgba(255,255,255,.04)]" : "border-white/[.07] bg-black/15 hover:border-white/12 hover:bg-white/[.04]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${active ? "border-violet-300/22 bg-violet-400/12 text-violet-100" : "border-white/[.07] bg-white/[.025] text-white/42 group-hover:text-white/65"}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-white/40">{detail}</span></span><span className={`h-2 w-2 rounded-full ${active ? "bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,.7)]" : "bg-white/15"}`} /></button>
}
