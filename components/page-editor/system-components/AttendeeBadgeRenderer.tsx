"use client"

export default function AttendeeBadgeRenderer() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/52">
            Attendee Badge
          </div>

          <div className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-white">
            Gary Deamer
          </div>

          <div className="mt-2 text-sm text-white/54">
            Executive Producer
          </div>
        </div>

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          GD
        </div>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">
          Checked In
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/54">
          VIP Access
        </div>
      </div>
    </div>
  )
}