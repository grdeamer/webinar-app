"use client"

import { useMemo, useState } from "react"
import { DotsHorizontal, Lock01, Mail01, UserPlus01, X } from "@untitledui/icons"

export type TeamMember = {
  id: string
  email: string
  name: string | null
  team_role: "owner" | "administrator"
  is_active: boolean
  invite_status: "active" | "pending"
  invited_at: string | null
  last_active_at: string | null
  is_current: boolean
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

function lastActive(value: string | null) {
  if (!value) return "Not yet"
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 1) return "Now"
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour")
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function initials(member: TeamMember) {
  const source = member.name?.trim() || member.email.split("@")[0]
  return source.split(/\s+|[._-]/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?"
}

export default function TeamAccessClient({ initialMembers, canManage }: { initialMembers: TeamMember[]; canManage: boolean }) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const pendingCount = useMemo(() => members.filter((member) => member.invite_status === "pending").length, [members])
  const activeCount = members.filter((member) => member.invite_status === "active" && member.is_active).length

  async function invite() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not send invitation")
      setMembers((current) => [...current, payload.member])
      setInviteOpen(false)
      setEmail("")
      setName("")
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not send invitation")
    } finally {
      setBusy(false)
    }
  }

  async function setActive(member: TeamMember, active: boolean) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update access")
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, is_active: active } : item))
      setMenuId(null)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update access")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="global-editorial-page mx-auto max-w-[1440px]">
      <header className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="text-[11px] font-semibold uppercase tracking-[.24em] text-white/36">Jupiter.events Admin</div><h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Team &amp; Access</h1><p className="mt-3 text-base text-white/58">Manage who can configure, produce, and review events.</p></div>
        {canManage ? <button type="button" onClick={() => { setInviteOpen(true); setError(null) }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/55 bg-blue-500/15 px-5 py-3 text-sm font-semibold text-blue-50 hover:bg-blue-500/24"><UserPlus01 className="h-4 w-4" />Invite administrator</button> : null}
      </header>

      <div className="py-7 text-sm text-white/52">{activeCount} active {activeCount === 1 ? "member" : "members"}<span className="mx-3 text-white/20">·</span>{pendingCount} pending {pendingCount === 1 ? "invitation" : "invitations"}</div>
      {error ? <div className="mb-5 rounded-xl border border-red-300/15 bg-red-400/[.07] px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <section className="overflow-x-auto border-y border-white/10">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[1.35fr_.65fr_1fr_.65fr_.55fr_48px] gap-4 border-b border-white/10 px-3 py-4 text-[10px] font-semibold uppercase tracking-[.18em] text-white/38"><div>Team member</div><div>Role</div><div>Access</div><div>Last active</div><div>Status</div><div /></div>
          {members.map((member) => <div key={member.id} className="grid grid-cols-[1.35fr_.65fr_1fr_.65fr_.55fr_48px] items-center gap-4 border-b border-white/[.075] px-3 py-5 last:border-0">
            <div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#13213f,#17172a)] text-sm font-semibold">{initials(member)}</div><div className="min-w-0"><div className="truncate font-semibold">{member.name || member.email.split("@")[0]}</div><div className="mt-1 truncate text-sm text-white/45">{member.email}</div></div></div>
            <div><span className="rounded-md border border-white/12 px-2.5 py-1.5 text-xs font-medium text-white/78">{member.team_role === "owner" ? "Owner" : "Administrator"}</span></div>
            <div className="text-sm text-white/66">All events and administration</div>
            <div className="text-sm text-white/58">{member.invite_status === "pending" ? member.invited_at ? `Invited ${new Date(member.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Invite sent" : lastActive(member.last_active_at)}</div>
            <div className={`text-sm font-medium ${member.invite_status === "pending" ? "text-amber-200" : member.is_active ? "text-emerald-200" : "text-white/35"}`}>{member.invite_status === "pending" ? "Pending" : member.is_active ? "Active" : "Disabled"}</div>
            <div className="relative flex justify-end">{member.team_role === "owner" ? <span title="Protected account"><Lock01 className="h-4 w-4 text-white/38" /></span> : canManage ? <><button type="button" aria-label={`Access options for ${member.email}`} onClick={() => setMenuId((current) => current === member.id ? null : member.id)} className="rounded-lg p-2 text-white/42 hover:bg-white/[.06] hover:text-white"><DotsHorizontal className="h-4 w-4" /></button>{menuId === member.id ? <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-white/10 bg-[#0b101d] p-1.5 shadow-2xl"><button type="button" disabled={busy} onClick={() => void setActive(member, !member.is_active)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]">{member.is_active ? "Disable access" : "Restore access"}</button></div> : null}</> : null}</div>
          </div>)}
          {members.length === 0 ? <div className="px-3 py-12 text-sm text-white/45">No administrators found.</div> : null}
        </div>
      </section>

      <div className="mt-7 flex items-center gap-3 text-sm text-white/42"><Lock01 className="h-4 w-4" /><span>Owners control team access and permanent account settings.</span></div>

      {inviteOpen ? <div role="dialog" aria-modal="true" aria-labelledby="invite-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#080d19] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200/55">Team access</div><h2 id="invite-title" className="mt-2 text-2xl font-semibold">Invite an administrator</h2></div><button type="button" aria-label="Close invitation" onClick={() => setInviteOpen(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06]"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm leading-6 text-white/50">Administrators can configure events, operate live tools, and manage attendees. Only the Owner can manage administrator access.</p><div className="mt-6 space-y-4"><label className="block text-xs font-semibold text-white/55">Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-blue-400/50" /></label><label className="block text-xs font-semibold text-white/55">Email<input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-blue-400/50" /></label></div>{error ? <div className="mt-4 text-sm text-red-200">{error}</div> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setInviteOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">Cancel</button><button type="button" disabled={busy || !email.includes("@")} onClick={() => void invite()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40"><Mail01 className="h-4 w-4" />{busy ? "Sending…" : "Send invitation"}</button></div></div></div> : null}
    </div>
  )
}
