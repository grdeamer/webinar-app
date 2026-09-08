"use client"

import { Camera, ChevronRight, LogOut, Mail, Pencil, UserRound, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"

type Profile = {
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

const EMPTY_PROFILE: Profile = { name: "Jupiter User", email: "", avatarUrl: null, role: "member" }

const JUPITER_AVATARS = [
  { name: "Amara", src: "/avatars/jupiter/producer-amara.png" },
  { name: "Kenji", src: "/avatars/jupiter/director-kenji.png" },
  { name: "Ravi", src: "/avatars/jupiter/creative-ravi.png" },
  { name: "Elena", src: "/avatars/jupiter/director-elena.png" },
  { name: "Pug astronaut", src: "/avatars/jupiter/pug-astronaut.png" },
] as const

function initialsFor(profile: Profile): string {
  const source = profile.name.trim() || profile.email.split("@")[0] || "Jupiter User"
  const parts = source.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : source.slice(0, 2)).toUpperCase()
}

function roleLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function AdminProfileMenu({
  compact = false,
  popoverPlacement = "top",
}: {
  compact?: boolean
  popoverPlacement?: "top" | "bottom"
}) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/admin/profile", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile unavailable")
        return response.json() as Promise<{ profile: Profile }>
      })
      .then(({ profile: nextProfile }) => {
        setProfile(nextProfile)
        setName(nextProfile.name)
        setEmail(nextProfile.email)
      })
      .catch((fetchError: unknown) => {
        if (!(fetchError instanceof DOMException && fetchError.name === "AbortError")) setError("Profile unavailable")
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setEditing(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  useEffect(() => () => { if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

  const initials = useMemo(() => initialsFor(profile), [profile])
  const visibleAvatar = avatarPreview || profile.avatarUrl

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null
    setAvatarFile(file)
    setError(null)
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  function choosePreset(src: string): void {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(null)
    setAvatarPreview(src)
    setError(null)
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      let avatarUrl = avatarPreview?.startsWith("/") ? avatarPreview : profile.avatarUrl
      if (avatarFile) {
        const form = new FormData()
        form.set("file", avatarFile)
        const uploadResponse = await fetch("/api/admin/profile", { method: "POST", body: form })
        const uploadPayload = await uploadResponse.json() as { avatarUrl?: string; error?: string }
        if (!uploadResponse.ok || !uploadPayload.avatarUrl) throw new Error(uploadPayload.error || "Photo upload failed")
        avatarUrl = uploadPayload.avatarUrl
      }

      const response = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, avatarUrl }),
      })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || "Profile update failed")

      const nextProfile = { ...profile, name: name.trim(), email: email.trim().toLowerCase(), avatarUrl }
      setProfile(nextProfile)
      setAvatarFile(null)
      setAvatarPreview(null)
      setEditing(false)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profile update failed")
    } finally {
      setBusy(false)
    }
  }

  async function signOut(): Promise<void> {
    setBusy(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      await fetch("/api/admin/logout", { method: "POST" })
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <div ref={rootRef} className={`relative ${compact ? "flex justify-center" : "w-full"}`}>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); setEditing(false); setError(null) }}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={compact ? `${profile.name} — Account` : undefined}
        className={`group flex items-center rounded-2xl border border-white/10 bg-white/[0.035] text-left transition hover:border-violet-300/25 hover:bg-white/[0.06] ${compact ? "h-11 w-11 justify-center p-1" : "w-full gap-3 p-3"}`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-300/20 bg-[linear-gradient(135deg,#265cae,#7542ef)] text-sm font-black text-white shadow-[0_7px_20px_rgba(72,50,170,.24)]">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        {!compact ? <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{profile.name}</span><span className="mt-0.5 block truncate text-xs text-white/42">{profile.email || roleLabel(profile.role)}</span></span><ChevronRight size={16} className={`shrink-0 text-white/30 transition ${open ? "-rotate-90 text-violet-200/70" : "group-hover:text-white/55"}`} /></> : null}
      </button>

      {open ? (
        <div role="dialog" aria-label="Account menu" className={`absolute left-0 z-[300] w-[330px] overflow-hidden rounded-[20px] border border-violet-300/20 bg-[linear-gradient(180deg,rgba(10,15,30,.99),rgba(3,7,16,.995))] p-3 shadow-[0_28px_80px_rgba(0,0,0,.68),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-2xl ${popoverPlacement === "bottom" ? "top-[calc(100%+10px)]" : "bottom-[calc(100%+10px)]"}`}>
          {editing ? (
            <form onSubmit={(event) => void saveProfile(event)}>
              <div className="flex items-center justify-between px-1"><div><div className="text-[9px] font-bold uppercase tracking-[.18em] text-violet-200/55">Your profile</div><div className="mt-1 text-base font-semibold text-white">Edit account details</div></div><button type="button" onClick={() => setEditing(false)} aria-label="Close profile editor" className="rounded-lg p-2 text-white/35 hover:bg-white/[.06] hover:text-white"><X size={16} /></button></div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-300/20 bg-[linear-gradient(135deg,#265cae,#7542ef)] font-black text-white">{visibleAvatar ? <img src={visibleAvatar} alt="Profile preview" className="h-full w-full object-cover" /> : initials}</span>
                <div><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/72 hover:bg-white/[.08]"><Camera size={14} />Change photo</button><p className="mt-1.5 text-[10px] text-white/32">JPEG, PNG or WebP · 2 MB max</p></div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} className="hidden" />
              </div>
              <fieldset className="mt-3">
                <legend className="text-[10px] font-semibold uppercase tracking-[.12em] text-white/42">Choose a Jupiter avatar</legend>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {JUPITER_AVATARS.map((avatar) => {
                    const selected = visibleAvatar === avatar.src
                    return <button key={avatar.src} type="button" onClick={() => choosePreset(avatar.src)} aria-label={`Use ${avatar.name} avatar`} aria-pressed={selected} className={`aspect-square overflow-hidden rounded-full border-2 p-0.5 transition hover:scale-105 hover:border-violet-200/70 ${selected ? "border-violet-400 shadow-[0_0_0_2px_rgba(139,92,246,.22)]" : "border-white/10"}`}><img src={avatar.src} alt="" className="h-full w-full rounded-full object-cover" /></button>
                  })}
                </div>
              </fieldset>
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[.12em] text-white/42">Name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-violet-300/40" /></label>
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[.12em] text-white/42">Email<input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm normal-case tracking-normal text-white outline-none focus:border-violet-300/40" /></label>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2 text-xs text-white/45"><UserRound size={14} />{roleLabel(profile.role)} access</div>
              {error ? <p role="alert" className="mt-3 rounded-lg border border-red-300/15 bg-red-400/[.07] px-3 py-2 text-xs text-red-100/80">{error}</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/58 hover:bg-white/[.05]">Cancel</button><button type="submit" disabled={busy} className="rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-45">{busy ? "Saving…" : "Save profile"}</button></div>
            </form>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-[14px] border border-white/[.07] bg-white/[.025] p-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-300/20 bg-[linear-gradient(135deg,#265cae,#7542ef)] font-black text-white">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}</span><div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{profile.name}</div><div className="mt-1 truncate text-xs text-white/42">{profile.email}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[.12em] text-violet-200/55">{roleLabel(profile.role)}</div></div></div>
              {error ? <p role="alert" className="mt-2 rounded-lg border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-xs text-amber-100/72">{error}</p> : null}
              <button type="button" onClick={() => setEditing(true)} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/70 hover:bg-white/[.055] hover:text-white"><Pencil size={16} className="text-violet-200/70" />Edit profile</button>
              <div className="mx-2 my-1 h-px bg-white/[.07]" />
              <button type="button" disabled={busy} onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-200/75 hover:bg-red-400/[.07] hover:text-red-100 disabled:opacity-45"><LogOut size={16} />{busy ? "Signing out…" : "Sign out"}</button>
              <div className="mt-1 flex items-center gap-2 px-3 pb-1 text-[10px] text-white/25"><Mail size={12} />Account changes apply site-wide.</div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
