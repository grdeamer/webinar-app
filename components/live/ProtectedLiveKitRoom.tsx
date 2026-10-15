"use client"

import { useEffect, useState, type PropsWithChildren } from "react"
import { LiveKitRoom, type LiveKitRoomProps } from "@livekit/components-react"
import { ConnectionState, Room, RoomEvent } from "livekit-client"
import type { PublisherTrackPermission } from "@/lib/live/publisherPolicy"

/** Set the SFU default to deny before connecting or publishing the first track. */
export default function ProtectedLiveKitRoom({ children, ...props }: PropsWithChildren<Omit<LiveKitRoomProps, "room">>) {
  const [room] = useState(() => {
    const instance = new Room(props.options)
    instance.localParticipant.setTrackSubscriptionPermissions(false, [])
    return instance
  })
  const [protectedState, setProtectedState] = useState(false)

  useEffect(() => {
    let cancelled = false
    let pending = false
    let credential = props.token
    let lastSuccess = 0
    let generation = 0
    let activeRequest: AbortController | null = null

    function closeAccess() {
      generation++
      lastSuccess = 0
      room.localParticipant.setTrackSubscriptionPermissions(false, [])
      if (!cancelled) setProtectedState(false)
    }

    async function refresh() {
      if (pending || cancelled || room.state !== ConnectionState.Connected || !credential) return
      pending = true
      const requestGeneration = generation
      const controller = new AbortController()
      activeRequest = controller
      const timeout = window.setTimeout(() => controller.abort(), 4000)
      try {
        const response = await fetch("/api/livekit/publisher-policy", {
          method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${credential}` }, signal: controller.signal,
        })
        const data = await response.json() as { permissions?: PublisherTrackPermission[]; policyToken?: string }
        if (!response.ok || !Array.isArray(data.permissions) || !data.policyToken) throw new Error("Policy unavailable")
        if (cancelled || requestGeneration !== generation || room.state !== ConnectionState.Connected) return
        room.localParticipant.setTrackSubscriptionPermissions(false, data.permissions)
        credential = data.policyToken
        lastSuccess = Date.now()
        setProtectedState(true)
      } catch {
        if (!cancelled) closeAccess()
      } finally {
        window.clearTimeout(timeout)
        pending = false
        activeRequest = null
      }
    }

    function reconnecting() { closeAccess(); activeRequest?.abort() }
    function changed() { void refresh() }
    room.on(RoomEvent.Connected, changed).on(RoomEvent.Reconnected, changed)
      .on(RoomEvent.Reconnecting, reconnecting).on(RoomEvent.Disconnected, reconnecting)
      .on(RoomEvent.ParticipantConnected, changed).on(RoomEvent.ParticipantDisconnected, changed)
      .on(RoomEvent.LocalTrackPublished, changed).on(RoomEvent.LocalTrackUnpublished, changed)
    void refresh()
    const interval = window.setInterval(changed, 1500)
    // A hung request or lost API connection must never leave an old allowlist open.
    const watchdog = window.setInterval(() => {
      if (lastSuccess && Date.now() - lastSuccess > 5000) closeAccess()
    }, 250)
    return () => {
      cancelled = true
      activeRequest?.abort()
      window.clearInterval(interval)
      window.clearInterval(watchdog)
      room.off(RoomEvent.Connected, changed).off(RoomEvent.Reconnected, changed)
        .off(RoomEvent.Reconnecting, reconnecting).off(RoomEvent.Disconnected, reconnecting)
        .off(RoomEvent.ParticipantConnected, changed).off(RoomEvent.ParticipantDisconnected, changed)
        .off(RoomEvent.LocalTrackPublished, changed).off(RoomEvent.LocalTrackUnpublished, changed)
      closeAccess()
    }
  }, [room, props.token])

  return <LiveKitRoom {...props} room={room}>
    {!protectedState ? <div role="status" className="fixed bottom-4 left-4 z-[2000] max-w-sm rounded-xl border border-amber-300/30 bg-slate-950 px-4 py-3 text-sm text-amber-100">
      Backstage protection is connecting. Media access stays closed until verified.
    </div> : null}
    {children}
  </LiveKitRoom>
}
