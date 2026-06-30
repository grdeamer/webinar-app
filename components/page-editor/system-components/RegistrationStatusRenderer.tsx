"use client"

export default function RegistrationStatusRenderer() {
  return (
    <div className="rounded-[28px] border border-emerald-400/18 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)]" />

        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/60">
          Registration Status
        </div>
      </div>

      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
        Confirmed
      </div>

      <p className="mt-3 max-w-xl text-sm leading-7 text-white/58">
        Your registration is active and approved for event participation.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/54">
          Approved
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/54">
          Access Granted
        </div>
      </div>
    </div>
  )
}