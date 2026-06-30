"use client"

export default function WaitlistStatusRenderer() {
  return (
    <div className="rounded-[28px] border border-sky-300/16 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/54">
        Waitlist Status
      </div>

      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-white">
        You Are On The Waitlist
      </h3>

      <p className="mt-4 text-sm leading-7 text-white/58">
        Event capacity has currently been reached. Your registration remains
        active and will automatically be promoted if availability opens.
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.65)]" />

        <div className="text-sm text-white/68">
          Estimated position: <span className="font-semibold text-white">#12</span>
        </div>
      </div>
    </div>
  )
}