"use client"

import Link from "next/link"
import { type ReactNode, useMemo, useState } from "react"
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, Clock3, KeyRound, Mail, MailCheck, Send, TestTube2, UserCheck, UsersRound, UserX } from "lucide-react"

type Campaign = "confirmations" | "presenters"
type Result = { sent: number; failed: number; test: boolean }
type CampaignHistory = { id: string; campaign_type: string; mode: string; status: string; recipient_count: number; accepted_count: number; failed_count: number; created_at: string }

export default function CommunicationsClient({ eventId, eventTitle, counts, history }: {
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

  const productionHistory = useMemo(() => history.filter((item) => item.mode === "production"), [history])
  const recipientsReached = productionHistory.reduce((sum, item) => sum + item.accepted_count, 0)
  const needsAttention = counts.presentersMissingSessions + counts.missingEmails
  const recipientCount = campaign === "confirmations" ? counts.sendable : counts.presenters
  const endpoint = campaign === "confirmations" ? "send-confirmations" : "send-presenter-links"
  const campaignName = campaign === "confirmations" ? "Attendee Confirmation" : "Presenter Access"
  const campaignDescription = campaign === "confirmations"
    ? `Confirm registration and provide the event access details for ${eventTitle}.`
    : "Deliver each presenter’s secure access link and assigned session details."

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

  function selectCampaign(nextCampaign: Campaign) {
    setCampaign(nextCampaign)
    setResult(null)
    setError(null)
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 text-white">
      <section className="flex flex-col gap-5 border-b border-[#1d2b40] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="editorial-eyebrow">Event &nbsp;/&nbsp; Communications</div>
          <h1 className="mt-2.5 text-[34px] font-semibold tracking-[-.04em]">Communications</h1>
          <p className="mt-1.5 text-sm text-white/52">Create, test, and deliver event messages to the right audience.</p>
        </div>
        <a href="#message-center" className="inline-flex w-fit items-center gap-2 rounded-lg border border-violet-400/55 bg-violet-500/[.08] px-4 py-2.5 text-sm font-semibold text-violet-50 shadow-[0_0_20px_rgba(139,92,246,.08)] transition hover:border-violet-300 hover:bg-violet-500/[.15]">Compose message <span className="text-lg font-light leading-none">+</span></a>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Send />} tone="violet" label="Messages sent" value={productionHistory.length} detail="Production sends" />
        <StatCard icon={<UsersRound />} tone="blue" label="Recipients reached" value={recipientsReached} detail="Accepted deliveries" />
        <StatCard icon={<MailCheck />} tone="cyan" label="Sendable" value={counts.sendable} detail={`${counts.everyone} people total`} />
        <StatCard icon={<UserCheck />} tone="emerald" label="Presenters" value={counts.presenters} detail="Access audience" />
        <StatCard icon={<UserX />} tone={needsAttention ? "amber" : "slate"} label="Needs attention" value={needsAttention} detail={needsAttention ? "Resolve before sending" : "Audience is ready"} />
      </section>

      <section id="message-center" className="scroll-mt-8 grid gap-4 xl:grid-cols-[.96fr_1.02fr_1fr]">
        <Panel className="min-w-0">
          <PanelHeading number="1" title="Select message" subtitle="Choose a delivery workflow" />
          <div className="mt-4 space-y-2.5">
            <CampaignButton icon={<Mail size={17} />} active={campaign === "confirmations"} title="Attendee Confirmation" type="Event update" detail={`${counts.sendable} eligible addresses`} tone="violet" onClick={() => selectCampaign("confirmations")} />
            <CampaignButton icon={<KeyRound size={17} />} active={campaign === "presenters"} title="Presenter Access" type="Access message" detail={`${counts.presenters} presenters`} tone="blue" onClick={() => selectCampaign("presenters")} />
          </div>
          <div className="mt-4 rounded-xl border border-white/[.07] bg-black/15 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/60"><UsersRound size={14} />Audience source</div>
            <p className="mt-2 text-xs leading-5 text-white/40">People is the source of truth for addresses, roles, and presenter assignments.</p>
            <Link href={`/admin/events/${eventId}/attendees`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-300/80 transition hover:text-sky-200">Review people <ArrowUpRight size={13} /></Link>
          </div>
        </Panel>

        <Panel className="min-w-0">
          <PanelHeading number="2" title="Review & send" subtitle="Confirm the audience and delivery" />
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[.08] bg-[#050a14]">
            <div className="border-b border-white/[.075] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-base font-semibold tracking-[-.015em]">{campaignName}</h2><div className="mt-1 text-[11px] text-white/38">Event message · Ready to test</div></div>
                <span className="rounded-full border border-white/[.08] bg-white/[.06] px-2.5 py-1 text-[10px] font-semibold text-white/55">Draft</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-white/48">{campaignDescription}</p>
            </div>
            <ReviewRow icon={<UsersRound />} label="Recipients" value={`${recipientCount} eligible`} />
            <ReviewRow icon={<Mail />} label="Delivery" value="Email" />
            <ReviewRow icon={<Clock3 />} label="Send time" value="Send now" last />
          </div>

          {campaign === "presenters" && counts.presentersMissingSessions > 0 ? <div className="mt-3 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-500/[.08] p-3.5 text-xs text-amber-100"><AlertTriangle className="mt-0.5 shrink-0" size={16} /><div><div className="font-semibold">{counts.presentersMissingSessions} presenter{counts.presentersMissingSessions === 1 ? " is" : "s are"} missing session access.</div><div className="mt-1 text-amber-100/60">Assign sessions before the production send.</div></div></div> : null}
          {recipientCount === 0 ? <div className="mt-3 flex items-start gap-3 rounded-xl border border-sky-300/15 bg-sky-400/[.05] p-3.5"><UsersRound className="mt-0.5 shrink-0 text-sky-200/75" size={17} /><div><div className="text-xs font-semibold">No eligible recipients yet</div><Link href={`/admin/events/${eventId}/attendees`} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-sky-200/75">Open People <ArrowUpRight size={12} /></Link></div></div> : null}

          <label className="mt-4 block text-[11px] font-semibold text-white/48">Send a test first
            <div className="mt-2 flex gap-2"><input aria-label="Test recipient email" type="email" placeholder="you@company.com" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#040812] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/22 focus:border-sky-300/35" /><button type="button" disabled={busy !== null || recipientCount === 0} onClick={() => void run("test")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[.09] bg-white/[.035] px-3.5 py-2.5 text-xs font-semibold text-white/62 transition hover:bg-white/[.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><TestTube2 size={14} />{busy === "test" ? "Sending…" : "Send test"}</button></div>
          </label>

          <div className="mt-3 grid gap-2 sm:grid-cols-[.78fr_1.22fr]">
            <div className="flex items-center justify-center rounded-lg border border-white/[.09] px-4 py-3 text-xs font-semibold text-white/42">Draft saved automatically</div>
            <button type="button" disabled={busy !== null || recipientCount === 0 || (campaign === "presenters" && counts.presentersMissingSessions > 0)} onClick={() => void run("send")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#5740b8] to-[#8a4be0] px-4 py-3 text-xs font-semibold shadow-[0_10px_28px_rgba(103,80,211,.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/[.06] disabled:text-white/28 disabled:shadow-none">{busy === "send" ? "Sending…" : `Send to ${recipientCount}`}<Send size={14} /></button>
          </div>

          {error ? <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">{error}</div> : null}
          {result ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100"><CheckCircle2 size={16} />{result.test ? "Test accepted by Resend." : `${result.sent} accepted by Resend${result.failed ? `, ${result.failed} rejected` : ""}.`}</div> : null}
        </Panel>

        <Panel className="min-w-0">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold">Recent sends</h2><p className="mt-1 text-xs text-white/38">Delivery history for this event</p></div><Mail size={17} className="text-white/28" /></div>
          <div className="mt-4 divide-y divide-white/[.075] overflow-hidden rounded-xl border border-white/[.08] bg-[#050a14]">
            {history.map((item) => <HistoryRow key={item.id} item={item} />)}
            {history.length === 0 ? <div className="px-4 py-12 text-center"><Mail className="mx-auto text-white/18" size={24} /><div className="mt-3 text-sm font-medium text-white/55">No sends recorded</div><p className="mt-1 text-xs text-white/32">Test and production activity will appear here.</p></div> : null}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#1d2b40] bg-[linear-gradient(145deg,rgba(8,16,30,.98),rgba(4,10,21,.98))] p-4 shadow-[inset_0_1px_rgba(255,255,255,.025),0_18px_50px_rgba(0,0,0,.08)] sm:p-5 ${className}`}>{children}</div>
}

function PanelHeading({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/18 bg-violet-400/[.08] text-xs font-semibold text-violet-100">{number}</span><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-0.5 text-xs text-white/36">{subtitle}</p></div></div>
}

const statTones = {
  violet: "border-violet-400/15 bg-violet-500/[.12] text-violet-200",
  blue: "border-blue-400/15 bg-blue-500/[.12] text-blue-200",
  cyan: "border-cyan-400/15 bg-cyan-500/[.12] text-cyan-200",
  emerald: "border-emerald-400/15 bg-emerald-500/[.12] text-emerald-200",
  amber: "border-amber-400/15 bg-amber-500/[.12] text-amber-200",
  slate: "border-slate-400/15 bg-slate-500/[.12] text-slate-200",
} as const

function StatCard({ icon, tone, label, value, detail }: { icon: ReactNode; tone: keyof typeof statTones; label: string; value: number; detail: string }) {
  return <div className="flex min-h-[94px] items-center gap-4 rounded-xl border border-[#1d2b40] bg-[#07101e] px-4 py-3.5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${statTones[tone]}`}>{icon}</span><div className="min-w-0"><div className="text-[11px] font-medium text-white/52">{label}</div><div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-.03em]">{value.toLocaleString()}</div><div className="mt-0.5 truncate text-[10px] text-white/34">{detail}</div></div></div>
}

function CampaignButton({ active, icon, title, type, detail, tone, onClick }: { active: boolean; icon: ReactNode; title: string; type: string; detail: string; tone: "violet" | "blue"; onClick: () => void }) {
  const iconTone = tone === "violet" ? "border-violet-300/18 bg-violet-500/20 text-violet-200" : "border-blue-300/18 bg-blue-500/20 text-blue-200"
  return <button type="button" onClick={onClick} aria-pressed={active} className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-violet-400/70 bg-violet-500/[.11] shadow-[inset_0_1px_rgba(255,255,255,.035),0_0_24px_rgba(139,92,246,.06)]" : "border-white/[.07] bg-[#050a14] hover:border-white/14 hover:bg-white/[.035]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconTone}`}>{icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{title}</span><span className="mt-0.5 block text-[10px] text-white/35">{type} · {detail}</span></span><ChevronRight size={15} className={active ? "text-violet-200" : "text-white/22"} /></button>
}

function ReviewRow({ icon, label, value, last = false }: { icon: ReactNode; label: string; value: string; last?: boolean }) {
  return <div className={`flex items-center gap-3 px-4 py-3 text-xs ${last ? "" : "border-b border-white/[.075]"}`}><span className="text-white/48">{icon}</span><span className="text-white/55">{label}</span><span className="ml-auto text-right font-medium text-white/74">{value}</span><ChevronRight size={13} className="text-white/24" /></div>
}

function HistoryRow({ item }: { item: CampaignHistory }) {
  const title = item.campaign_type === "confirmation" ? "Attendee Confirmation" : "Presenter Access"
  const isTest = item.mode === "test"
  return <div className="flex items-center gap-3 px-3.5 py-3 transition hover:bg-white/[.025]"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${item.failed_count ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"}`}><CheckCircle2 size={15} /></span><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-white/78">{title}</div><div className="mt-0.5 text-[10px] text-white/34">{new Date(item.created_at).toLocaleString()} · {isTest ? "Test" : "Production"}</div></div><div className="text-right"><div className="text-xs font-semibold tabular-nums text-white/66">{item.accepted_count}</div><div className="mt-0.5 text-[9px] text-white/28">accepted</div></div><ChevronRight size={13} className="text-white/20" /></div>
}
