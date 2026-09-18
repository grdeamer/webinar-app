"use client"

import { ChangeEvent, useMemo, useRef, useState } from "react"
import { DotsHorizontal, Lock01, Mail01, UserPlus01, X } from "@untitledui/icons"
import { Camera, Eye, MailX } from "lucide-react"
import {
  EVENT_FEATURES,
  EVENT_ROLE_FEATURES,
  featuresForEventRole,
  type EventFeature,
  type EventTeamRole,
} from "@/lib/eventPermissions"

export type TeamMember = {
  id: string
  user_id: string
  scope: "global" | "event"
  email: string
  name: string | null
  team_role: "owner" | "administrator" | null
  event_role: EventTeamRole | null
  event_id: string | null
  event_title: string | null
  feature_permissions: EventFeature[] | null
  is_active: boolean
  invite_status: "active" | "pending"
  invited_at: string | null
  last_active_at: string | null
  avatar_url: string | null
  is_current: boolean
}

type EventOption = { id: string; title: string }

const roleOptions: Array<{ value: EventTeamRole; label: string }> = [
  { value: "event_admin", label: "Event admin" },
  { value: "producer", label: "Producer" },
  { value: "viewer", label: "Viewer" },
]

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

export default function TeamAccessClient({ initialMembers, events, canManage }: { initialMembers: TeamMember[]; events: EventOption[]; canManage: boolean }) {
  const [members, setMembers] = useState(initialMembers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [eventInviteOpen, setEventInviteOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [sendInvitation, setSendInvitation] = useState(false)
  const [scope, setScope] = useState<"global" | "event">("event")
  const [eventId, setEventId] = useState(events[0]?.id ?? "")
  const [eventRole, setEventRole] = useState<EventTeamRole>("producer")
  const [features, setFeatures] = useState<EventFeature[]>(EVENT_ROLE_FEATURES.producer)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [existingAccount, setExistingAccount] = useState<{ email: string; name: string | null } | null>(null)
  const [avatarMember, setAvatarMember] = useState<TeamMember | null>(null)
  const avatarFileRef = useRef<HTMLInputElement | null>(null)

  const pendingCount = useMemo(() => members.filter((member) => member.invite_status === "pending").length, [members])
  const activeCount = members.filter((member) => member.invite_status === "active" && member.is_active).length

  async function invite() {
    setBusy(true)
    setError(null)
    try {
      const isEventScope = scope === "event"
      const response = await fetch(isEventScope ? `/api/admin/events/${eventId}/team/invite` : "/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEventScope
          ? { email, name, role: eventRole, featurePermissions: features, sendInvitation }
          : { email, name, sendInvitation, promoteExisting: existingAccount?.email === email.trim().toLowerCase() }),
      })
      const payload = await response.json().catch((): null => null)
      if (response.status === 409 && payload?.code === "existing_account") {
        setExistingAccount({ email: email.trim().toLowerCase(), name: payload.existingName || null })
        setError(null)
        return
      }
      if (!response.ok) throw new Error(payload?.error || "Could not send invitation")
      const event = events.find((option) => option.id === eventId)
      const member: TeamMember = isEventScope ? {
        id: payload.member.id,
        user_id: payload.member.user_id,
        scope: "event",
        email: payload.member.email,
        name: payload.member.name,
        team_role: null,
        event_role: eventRole,
        event_id: eventId,
        event_title: event?.title ?? "Event",
        feature_permissions: features,
        is_active: true,
        invite_status: payload.member.status,
        invited_at: new Date().toISOString(),
        last_active_at: null,
        avatar_url: null,
        is_current: false,
      } : payload.member
      setMembers((current) => [...current.filter((item) => !(item.scope === "event" && item.user_id === member.user_id && item.event_id === member.event_id)), member])
      setInviteOpen(false)
      setEventInviteOpen(false)
      setEmail("")
      setName("")
      setSendInvitation(false)
      setExistingAccount(null)
      setScope("event")
      setEventRole("producer")
      setFeatures(EVENT_ROLE_FEATURES.producer)
      setNotice(payload?.invitationSent
        ? `${member.email} was added and their access email was sent.`
        : `${member.email} was added without sending an email.`)
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not send invitation")
    } finally {
      setBusy(false)
    }
  }

  function chooseRole(role: EventTeamRole) {
    setEventRole(role)
    setFeatures([...EVENT_ROLE_FEATURES[role]])
  }

  function toggleFeature(feature: EventFeature) {
    setFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature])
  }

  function openEdit(member: TeamMember) {
    setEditingMember(member)
    setScope(member.scope)
    setEventId(member.event_id ?? events[0]?.id ?? "")
    const role = member.event_role ?? "producer"
    setEventRole(role)
    setFeatures(featuresForEventRole(role, member.scope === "event" ? member.feature_permissions : null))
    setMenuId(null)
    setError(null)
  }

  async function saveEventAccess() {
    if (!editingMember) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/team/${editingMember.user_id}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, eventId, role: eventRole, featurePermissions: features }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not update event access")
      const updated = { ...editingMember, ...payload.member, last_active_at: editingMember.last_active_at, avatar_url: editingMember.avatar_url, is_current: editingMember.is_current } as TeamMember
      setMembers((current) => [...current.filter((member) => member.user_id !== editingMember.user_id), updated])
      setNotice(`${editingMember.name || editingMember.email}’s access was updated.`)
      setEditingMember(null)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update event access")
    } finally {
      setBusy(false)
    }
  }

  async function setActive(member: TeamMember, active: boolean) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(member.scope === "event" ? `/api/admin/events/${member.event_id}/team/${member.id}` : `/api/admin/team/${member.user_id}`, {
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

  async function sendPasswordReset(member: TeamMember) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/team/${member.user_id}/reset-password`, { method: "POST" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not send the password reset link")
      setNotice(`Password reset link sent to ${member.email}.`)
      setMenuId(null)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not send the password reset link")
    } finally {
      setBusy(false)
    }
  }

  async function resendInvitation(member: TeamMember) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const eventQuery = member.event_id ? `?eventId=${encodeURIComponent(member.event_id)}` : ""
      const response = await fetch(`/api/admin/team/${member.user_id}/resend-invite${eventQuery}`, { method: "POST" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) throw new Error(payload?.error || "Could not resend the invitation")
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, invited_at: payload.invitedAt || item.invited_at } : item))
      setNotice(`${member.invite_status === "pending" ? "Fresh invitation" : "Jupiter access email"} sent to ${member.email}`)
      setMenuId(null)
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not resend the invitation")
    } finally {
      setBusy(false)
    }
  }

  async function copyTestLogin(member: TeamMember) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const eventQuery = member.event_id ? `?eventId=${encodeURIComponent(member.event_id)}` : ""
      const response = await fetch(`/api/admin/team/${member.user_id}/test-login${eventQuery}`, { method: "POST" })
      const payload = await response.json().catch((): null => null)
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Could not create a test sign-in link")
      await navigator.clipboard.writeText(payload.url)
      setNotice(`One-time test login copied for ${member.email}. Open it in a private browser window so your Owner session stays signed in.`)
      setMenuId(null)
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not create a test sign-in link")
    } finally {
      setBusy(false)
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !avatarMember) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(`/api/admin/team/${avatarMember.user_id}/avatar`, { method: "POST", body: form })
      const payload = await response.json().catch((): null => null)
      if (!response.ok || !payload?.avatarUrl) throw new Error(payload?.error || "Could not update the profile photo")
      setMembers((current) => current.map((member) => member.id === avatarMember.id ? { ...member, avatar_url: payload.avatarUrl } : member))
      setNotice(`${avatarMember.name || avatarMember.email}’s profile photo was updated.`)
      setAvatarMember(null)
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "Could not update the profile photo")
    } finally {
      event.target.value = ""
      setBusy(false)
    }
  }

  return (
    <div className="global-editorial-page team-access-page mx-auto max-w-[1440px]">
      <header className="team-access-header flex flex-col gap-6 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="text-[11px] font-semibold uppercase tracking-[.24em] text-white/46">Jupiter.events Admin</div><h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Team &amp; Access</h1><p className="mt-3 text-base text-white/64">Manage who can configure, produce, and review events.</p></div>
        {canManage ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setScope("event"); setEventInviteOpen(true); setError(null); setSendInvitation(false) }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/45 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-50 hover:bg-violet-500/20"><UserPlus01 className="h-4 w-4" />Grant event access</button><button type="button" onClick={() => { setScope("global"); setInviteOpen(true); setError(null); setExistingAccount(null); setSendInvitation(false) }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/55 bg-blue-500/15 px-5 py-3 text-sm font-semibold text-blue-50 hover:bg-blue-500/24"><UserPlus01 className="h-4 w-4" />Add administrator</button></div> : null}
      </header>

      <div className="team-access-content">
      <div className="py-7 text-sm text-white/52">{activeCount} active {activeCount === 1 ? "member" : "members"}<span className="mx-3 text-white/20">·</span>{pendingCount} awaiting access</div>
      {error ? <div className="mb-5 rounded-xl border border-red-300/15 bg-red-400/[.07] px-4 py-3 text-sm text-red-100">{error}</div> : null}
      {notice ? <div className="mb-5 rounded-xl border border-emerald-300/15 bg-emerald-400/[.07] px-4 py-3 text-sm text-emerald-100">{notice}</div> : null}

      <section className="overflow-x-auto border-y border-white/10">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[1.35fr_.65fr_1fr_.65fr_.55fr_48px] gap-4 border-b border-white/10 px-3 py-4 text-[10px] font-semibold uppercase tracking-[.18em] text-white/38"><div>Team member</div><div>Role</div><div>Access</div><div>Last active</div><div>Status</div><div /></div>
          {members.map((member) => <div key={member.id} className="grid grid-cols-[1.35fr_.65fr_1fr_.65fr_.55fr_48px] items-center gap-4 border-b border-white/[.075] px-3 py-5 last:border-0">
            <div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(135deg,#13213f,#17172a)] text-sm font-semibold">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(member)}</div><div className="min-w-0"><button type="button" onClick={() => openEdit(member)} className="block max-w-full truncate text-left font-semibold text-white underline decoration-blue-400/35 underline-offset-4 transition hover:text-blue-200 hover:decoration-blue-300">{member.name || member.email.split("@")[0]}</button><div className="mt-1 truncate text-sm text-white/45">{member.email}</div></div></div>
            <div><span className="rounded-md border border-white/12 px-2.5 py-1.5 text-xs font-medium text-white/78">{member.scope === "global" ? member.team_role === "owner" ? "Owner" : "Administrator" : roleOptions.find((option) => option.value === member.event_role)?.label ?? "Event member"}</span></div>
            <div className="text-sm text-white/66">{member.scope === "global" ? "All events and administration" : <><span className="block font-medium text-white/78">{member.event_title}</span><span className="mt-1 block text-xs text-white/38">{featuresForEventRole(member.event_role ?? "viewer", member.feature_permissions).length} features</span></>}</div>
            <div className="text-sm text-white/58">{member.invite_status === "pending" ? member.invited_at ? `Invited ${new Date(member.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Email held" : lastActive(member.last_active_at)}</div>
            <div className={`text-sm font-medium ${member.invite_status === "pending" ? "text-amber-200" : member.is_active ? "text-emerald-200" : "text-white/35"}`}>{member.invite_status === "pending" ? "Pending" : member.is_active ? "Active" : "Disabled"}</div>
            <div className="relative flex justify-end">{canManage ? <><button type="button" aria-label={`Access options for ${member.email}`} onClick={() => setMenuId((current) => current === member.id ? null : member.id)} className="rounded-lg p-2 text-white/42 hover:bg-white/[.06] hover:text-white"><DotsHorizontal className="h-4 w-4" /></button>{menuId === member.id ? <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-white/10 bg-[#0b101d] p-1.5 shadow-2xl"><button type="button" disabled={busy} onClick={() => openEdit(member)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]">Open full profile</button><button type="button" disabled={busy} onClick={() => void copyTestLogin(member)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]"><Eye className="h-4 w-4 text-blue-200/70" />Copy one-time test login</button><button type="button" disabled={busy} onClick={() => { setAvatarMember(member); setMenuId(null) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]"><Camera className="h-4 w-4 text-violet-200/70" />Change profile photo</button><div className="my-1 h-px bg-white/[.07]" /><button type="button" disabled={busy} onClick={() => void resendInvitation(member)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]">{member.invite_status === "pending" ? "Send invitation" : "Send Jupiter access email"}</button>{member.invite_status !== "pending" ? <button type="button" disabled={busy} onClick={() => void sendPasswordReset(member)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]">Send password reset</button> : null}{member.team_role !== "owner" ? <button type="button" disabled={busy} onClick={() => void setActive(member, !member.is_active)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[.06]">{member.is_active ? "Disable access" : "Restore access"}</button> : <div className="px-3 py-2 text-xs text-white/35">Owner access is protected</div>}</div> : null}</> : member.team_role === "owner" ? <span title="Protected account"><Lock01 className="h-4 w-4 text-white/38" /></span> : null}</div>
          </div>)}
          {members.length === 0 ? <div className="px-3 py-12 text-sm text-white/45">No administrators found.</div> : null}
        </div>
      </section>

      <div className="mt-7 flex items-center gap-3 text-sm text-white/42"><Lock01 className="h-4 w-4" /><span>Owners control team access and permanent account settings.</span></div>
      </div>

      {eventInviteOpen ? <div role="dialog" aria-modal="true" aria-labelledby="event-access-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"><div className="my-auto w-full max-w-2xl rounded-2xl border border-white/12 bg-[#080d19] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-violet-200/60">Event-scoped access</div><h2 id="event-access-title" className="mt-2 text-2xl font-semibold">Grant access to one event</h2><p className="mt-2 text-sm text-white/48">They will only see the selected event and the features you allow.</p></div><button type="button" aria-label="Close" onClick={() => setEventInviteOpen(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06]"><X className="h-4 w-4" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-white/55">Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-violet-400/50" /></label><label className="text-xs font-semibold text-white/55">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-violet-400/50" /></label><label className="text-xs font-semibold text-white/55 sm:col-span-2">Event<select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-2 w-full rounded-xl border border-white/12 bg-[#070b15] px-4 py-3 text-sm outline-none focus:border-violet-400/50">{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label></div><fieldset className="mt-5"><legend className="text-xs font-semibold text-white/55">Role preset</legend><div className="mt-2 grid grid-cols-3 gap-2">{roleOptions.map((option) => <button key={option.value} type="button" onClick={() => chooseRole(option.value)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${eventRole === option.value ? "border-violet-400/55 bg-violet-500/16 text-white" : "border-white/10 text-white/55 hover:bg-white/[.04]"}`}>{option.label}</button>)}</div></fieldset><fieldset className="mt-5"><legend className="text-xs font-semibold text-white/55">Allowed features</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{EVENT_FEATURES.map((feature) => <label key={feature.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${features.includes(feature.key) ? "border-blue-400/35 bg-blue-500/[.08]" : "border-white/[.08] bg-white/[.015]"}`}><input type="checkbox" checked={features.includes(feature.key)} onChange={() => toggleFeature(feature.key)} className="mt-1" /><span><strong className="block text-sm text-white/82">{feature.label}</strong><span className="mt-1 block text-xs leading-5 text-white/38">{feature.description}</span></span></label>)}</div></fieldset><button type="button" role="switch" aria-checked={sendInvitation} onClick={() => setSendInvitation((value) => !value)} className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-left"><span className="text-sm font-semibold">Send invitation now</span><span className={`relative h-6 w-11 rounded-full transition ${sendInvitation ? "bg-blue-500" : "bg-white/12"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${sendInvitation ? "left-6" : "left-1"}`} /></span></button>{error ? <div className="mt-4 text-sm text-red-200">{error}</div> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEventInviteOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">Cancel</button><button type="button" disabled={busy || !email.includes("@") || !eventId || features.length === 0} onClick={() => void invite()} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40">{busy ? "Working…" : "Grant event access"}</button></div></div></div> : null}

      {inviteOpen ? <div role="dialog" aria-modal="true" aria-labelledby="invite-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#080d19] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200/55">Team access</div><h2 id="invite-title" className="mt-2 text-2xl font-semibold">{existingAccount ? "Grant administrator access" : "Add an administrator"}</h2></div><button type="button" aria-label="Close invitation" onClick={() => setInviteOpen(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06]"><X className="h-4 w-4" /></button></div><p className="mt-3 text-sm leading-6 text-white/50">Administrators can configure events, operate live tools, and manage attendees. You can create the account now and send their invitation later.</p><div className="mt-6 space-y-4"><label className="block text-xs font-semibold text-white/55">Name<input value={name} onChange={(event) => { setName(event.target.value); setError(null); setExistingAccount(null) }} placeholder="Full name" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-blue-400/50" /></label><label className="block text-xs font-semibold text-white/55">Email<input autoFocus type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(null); setExistingAccount(null) }} placeholder="name@company.com" className="mt-2 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-sm outline-none focus:border-blue-400/50" /></label></div><button type="button" role="switch" aria-checked={sendInvitation} onClick={() => setSendInvitation((value) => !value)} className="mt-5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-left"><span className="flex items-center gap-3">{sendInvitation ? <Mail01 className="h-4 w-4 text-blue-200" /> : <MailX className="h-4 w-4 text-white/40" />}<span><strong className="block text-sm">Send invitation now</strong><span className="mt-1 block text-xs text-white/40">{sendInvitation ? "Jupiter will email secure access immediately." : "No email will be sent until you choose Send invitation."}</span></span></span><span className={`relative h-6 w-11 rounded-full transition ${sendInvitation ? "bg-blue-500" : "bg-white/12"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${sendInvitation ? "left-6" : "left-1"}`} /></span></button>{existingAccount ? <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-400/[.08] px-4 py-3 text-sm leading-6 text-blue-100/80"><strong className="block text-blue-50">Existing Jupiter account found</strong>{existingAccount.name || existingAccount.email} can keep the same sign-in. Confirming adds administrator access{sendInvitation ? " and sends a secure access email" : " without sending an email"}.</div> : null}{error ? <div className="mt-4 text-sm text-red-200">{error}</div> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setInviteOpen(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">Cancel</button><button type="button" disabled={busy || !email.includes("@")} onClick={() => void invite()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40">{sendInvitation ? <Mail01 className="h-4 w-4" /> : <UserPlus01 className="h-4 w-4" />}{busy ? "Working…" : existingAccount ? "Grant admin access" : sendInvitation ? "Create and send" : "Create account"}</button></div></div></div> : null}

      {editingMember ? (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-access-title" className="fixed inset-0 z-50 overflow-y-auto bg-black/78 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-2xl border border-white/12 bg-[#080d19] shadow-2xl sm:my-8">
            <div className="flex items-start justify-between gap-5 border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(76,108,255,.18),transparent_42%),linear-gradient(120deg,#0a1120,#0b0d18)] p-5 sm:p-7">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(135deg,#172b50,#301c50)] text-xl font-semibold sm:h-20 sm:w-20 sm:text-2xl">
                  {editingMember.avatar_url ? <img src={editingMember.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(editingMember)}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-blue-200/55">Full access profile</div>
                  <h2 id="edit-access-title" className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{editingMember.name || editingMember.email.split("@")[0]}</h2>
                  <p className="mt-1 truncate text-sm text-white/48">{editingMember.email}</p>
                </div>
              </div>
              <button type="button" aria-label="Close full profile" onClick={() => setEditingMember(null)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06] hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <aside className="border-b border-white/10 bg-white/[.018] p-5 lg:border-b-0 lg:border-r lg:p-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/32">Status</div><div className={`mt-1.5 text-sm font-semibold ${editingMember.invite_status === "pending" ? "text-amber-200" : editingMember.is_active ? "text-emerald-200" : "text-white/40"}`}>{editingMember.invite_status === "pending" ? "Pending invitation" : editingMember.is_active ? "Active" : "Disabled"}</div></div>
                  <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/32">Last active</div><div className="mt-1.5 text-sm font-semibold text-white/72">{lastActive(editingMember.last_active_at)}</div></div>
                  <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/32">Current access</div><div className="mt-1.5 text-sm font-semibold text-white/72">{editingMember.scope === "global" ? "All events" : editingMember.event_title}</div></div>
                  <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><div className="text-[9px] font-semibold uppercase tracking-[.18em] text-white/32">Account</div><div className="mt-1.5 text-sm font-semibold text-white/72">{editingMember.team_role === "owner" ? "Owner" : editingMember.scope === "global" ? "Administrator" : roleOptions.find((option) => option.value === editingMember.event_role)?.label}</div></div>
                </div>
                <div className="mt-5 space-y-2">
                  <button type="button" onClick={() => { setAvatarMember(editingMember); setEditingMember(null) }} className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm font-semibold text-white/68 hover:bg-white/[.05]"><Camera className="h-4 w-4 text-violet-200/70" />Change profile photo</button>
                  <button type="button" disabled={busy} onClick={() => void copyTestLogin(editingMember)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-left text-sm font-semibold text-white/68 hover:bg-white/[.05] disabled:opacity-40"><Eye className="h-4 w-4 text-blue-200/70" />Copy test login</button>
                </div>
              </aside>

              <div className="p-5 sm:p-7">
                {editingMember.team_role === "owner" ? (
                  <div className="rounded-2xl border border-blue-300/15 bg-blue-400/[.06] p-5">
                    <div className="flex gap-3"><Lock01 className="mt-0.5 h-5 w-5 shrink-0 text-blue-200/70" /><div><h3 className="font-semibold text-blue-50">Owner access is protected</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">The owner always retains access to all events, administration, billing, and permanent account settings. This profile is view-only.</p></div></div>
                  </div>
                ) : (
                  <>
                    <fieldset>
                      <legend className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Access scope</legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <button type="button" onClick={() => setScope("global")} className={`rounded-2xl border p-4 text-left transition ${scope === "global" ? "border-blue-400/50 bg-blue-500/[.12]" : "border-white/10 bg-white/[.018] hover:bg-white/[.04]"}`}><strong className="block text-sm text-white">All events and administration</strong><span className="mt-1.5 block text-xs leading-5 text-white/42">Full platform access, including every current and future event.</span></button>
                        <button type="button" onClick={() => setScope("event")} className={`rounded-2xl border p-4 text-left transition ${scope === "event" ? "border-violet-400/50 bg-violet-500/[.12]" : "border-white/10 bg-white/[.018] hover:bg-white/[.04]"}`}><strong className="block text-sm text-white">One selected event</strong><span className="mt-1.5 block text-xs leading-5 text-white/42">Limit this user to one event and only the selected tools.</span></button>
                      </div>
                    </fieldset>

                    {scope === "event" ? (
                      <div className="mt-7 border-t border-white/10 pt-6">
                        <label className="block text-xs font-semibold uppercase tracking-[.16em] text-white/45">Event<select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-3 w-full rounded-xl border border-white/12 bg-[#070b15] px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:border-violet-400/50">{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
                        <fieldset className="mt-6"><legend className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Role preset</legend><div className="mt-3 grid grid-cols-3 gap-2">{roleOptions.map((option) => <button key={option.value} type="button" onClick={() => chooseRole(option.value)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${eventRole === option.value ? "border-violet-400/55 bg-violet-500/16 text-white" : "border-white/10 text-white/55 hover:bg-white/[.04]"}`}>{option.label}</button>)}</div></fieldset>
                        <fieldset className="mt-6"><legend className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Feature permissions</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{EVENT_FEATURES.map((feature) => <label key={feature.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 ${features.includes(feature.key) ? "border-blue-400/35 bg-blue-500/[.08]" : "border-white/[.08] bg-white/[.015]"}`}><input type="checkbox" checked={features.includes(feature.key)} onChange={() => toggleFeature(feature.key)} className="mt-1" /><span><strong className="block text-sm text-white/82">{feature.label}</strong><span className="mt-1 block text-xs leading-5 text-white/38">{feature.description}</span></span></label>)}</div></fieldset>
                      </div>
                    ) : (
                      <div className="mt-7 rounded-2xl border border-blue-300/15 bg-blue-400/[.055] p-5"><h3 className="font-semibold text-blue-50">Administrator permissions</h3><p className="mt-2 text-sm leading-6 text-white/50">This user can access every event and all administrative features. Choose “One selected event” above to restrict their access.</p></div>
                    )}
                  </>
                )}

                {error ? <div className="mt-5 rounded-xl border border-red-300/15 bg-red-400/[.07] px-4 py-3 text-sm text-red-100">{error}</div> : null}
                <div className="mt-7 flex flex-col-reverse justify-end gap-2 border-t border-white/10 pt-5 sm:flex-row">
                  <button type="button" onClick={() => setEditingMember(null)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/[.05]">{editingMember.team_role === "owner" ? "Close" : "Cancel"}</button>
                  {editingMember.team_role !== "owner" ? <button type="button" disabled={busy || (scope === "event" && (!eventId || features.length === 0))} onClick={() => void saveEventAccess()} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40">{busy ? "Saving…" : "Save permissions"}</button> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {avatarMember ? <div role="dialog" aria-modal="true" aria-labelledby="avatar-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#080d19] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-violet-200/55">Profile photo</div><h2 id="avatar-title" className="mt-2 text-xl font-semibold">{avatarMember.name || avatarMember.email}</h2></div><button type="button" aria-label="Close profile photo editor" onClick={() => setAvatarMember(null)} className="rounded-lg p-2 text-white/45 hover:bg-white/[.06]"><X className="h-4 w-4" /></button></div><div className="mt-6 flex flex-col items-center text-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-violet-300/20 bg-[linear-gradient(135deg,#13213f,#2a1747)] text-2xl font-semibold">{avatarMember.avatar_url ? <img src={avatarMember.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(avatarMember)}</div><p className="mt-4 text-sm text-white/48">JPEG, PNG, or WebP · 2 MB max</p><input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} className="hidden" /><button type="button" disabled={busy} onClick={() => avatarFileRef.current?.click()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40"><Camera className="h-4 w-4" />{busy ? "Uploading…" : "Choose new photo"}</button></div></div></div> : null}
    </div>
  )
}
