"use client"

export default function ApprovalGateRenderer() {
  return (
    <div className="rounded-[28px] border border-amber-300/16 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.10),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/54">
        Approval Required
      </div>

      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-white">
        Registration Pending Review
      </h3>

      <p className="mt-4 text-sm leading-7 text-white/58">
        Your submission has been received and is currently awaiting approval
        from the event administration team.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.18em] text-white/42">
            Current State
          </span>

          <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">
            Pending
          </span>
        </div>
      </div>
    </div>
  )
}