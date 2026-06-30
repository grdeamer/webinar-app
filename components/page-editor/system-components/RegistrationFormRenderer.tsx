

"use client"

export default function RegistrationFormRenderer() {
  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/50">
        Registration Form
      </div>

      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-white">
        Attendee Information
      </h3>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/40">
          First Name
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/40">
          Last Name
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/40 md:col-span-2">
          Email Address
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/40 md:col-span-2">
          Company / Organization
        </div>
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-2xl bg-violet-500 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_42px_rgba(139,92,246,0.32)] transition hover:bg-violet-400"
      >
        Continue
      </button>
    </div>
  )
}