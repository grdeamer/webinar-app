"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { sessionProgress, timelineGroups, type TimelineSession } from "@/lib/page-editor/sessionProgress"
import styles from "./LiveTimeline.module.css"

export type LiveTimelineProps = { sessions: TimelineSession[]; timelineTrack?: string; showRemaining?: boolean; accentColor?: string; previewNow?: number }

export default function LiveTimeline({ sessions, timelineTrack = "", showRemaining = true, accentColor = "#eb1700", previewNow }: LiveTimelineProps) {
  const [clock, setClock] = useState(0)
  useEffect(() => {
    const tick = () => setClock(Date.now())
    const initial = setTimeout(tick, 0)
    const timer = setInterval(tick, 1000)
    return () => { clearTimeout(initial); clearInterval(timer) }
  }, [])
  const now = previewNow ?? clock
  const groups = timelineGroups(sessions, timelineTrack)
  const accent = /^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#eb1700"
  function time(value?: string | null) {
    const date = new Date(value || "")
    return Number.isNaN(date.getTime()) ? "TBC" : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(date)
  }
  return <div className={styles.timeline} style={{ "--timeline-accent": accent } as CSSProperties}>
    {groups.length === 0 ? <p>No sessions {timelineTrack ? `in “${timelineTrack}”` : "scheduled"}.</p> : groups.map(group => <section key={group.name} aria-label={`${group.name} track`}>
      <header className={styles.header}><strong>{group.name}</strong><span>Track · Eastern Time</span></header>
      <ol className={styles.list}>{group.items.map(session => {
        const progress = sessionProgress(session, now)
        return <li key={session.id} className={styles.session} data-active={progress.active} data-complete={progress.fraction === 1}>
          <div className={styles.times}><strong>{time(session.start_at)}</strong><span>{time(session.end_at)}</span></div>
          <div className={styles.rail} role="progressbar" aria-label={`${session.title}: scheduled progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.fraction * 100)} aria-valuetext={progress.label}>
            <span className={styles.fill} style={{ height: `${progress.fraction * 100}%` }} /><span className={styles.dot} style={{ top: `${progress.fraction * 100}%` }} />
          </div>
          <div className={styles.card}><span className={styles.caption}>Session{session.status === "live" ? " · Live now" : ""}</span><h3>{session.title}</h3>{showRemaining ? <span className={styles.remaining}>{progress.label}</span> : null}</div>
        </li>
      })}</ol>
    </section>)}
  </div>
}
