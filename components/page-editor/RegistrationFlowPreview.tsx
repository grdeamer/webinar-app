"use client"

export default function RegistrationFlowPreview() {
  return (
    <div className="space-y-6 rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/50">
          Jupiter Registration
        </div>

        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-white">
          Reserve your place
        </h3>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
          A native registration experience for identity, session choice, capacity,
          approval, waitlist, confirmation, cancellation, and reporting.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42">
          First name
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42">
          Last name
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm text-white/42 md:col-span-2">
          Email address
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/38">
          Session Selection
        </div>

        <div className="mt-3 grid gap-3">
          <div className="rounded-2xl border border-emerald-300/18 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  General Session
                </div>
                <div className="mt-1 text-xs text-white/45">
                  26 of 500 seats reserved
                </div>
              </div>

              <div className="rounded-full border border-emerald-200/18 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/70">
                Available
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/18 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Limited Breakout
                </div>
                <div className="mt-1 text-xs text-white/45">
                  30 of 30 seats reserved
                </div>
              </div>

              <div className="rounded-full border border-amber-200/18 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/70">
                Waitlist
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="w-full rounded-2xl border border-sky-200/20 bg-sky-500/90 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_48px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
      >
        Continue Registration
      </button>
    </div>
  )
}