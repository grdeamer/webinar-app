"use client"

import { useSyncExternalStore } from "react"

type TimeOfDayGreetingProps = {
  as?: "h1" | "h2"
  className?: string
}

function greetingForLocalHour(hour: number) {
  if (hour < 12) return "Good morning."
  if (hour < 17) return "Good afternoon."
  return "Good evening."
}

function subscribe(onTimeChange: () => void) {
  const interval = window.setInterval(onTimeChange, 60_000)
  window.addEventListener("focus", onTimeChange)
  document.addEventListener("visibilitychange", onTimeChange)

  return () => {
    window.clearInterval(interval)
    window.removeEventListener("focus", onTimeChange)
    document.removeEventListener("visibilitychange", onTimeChange)
  }
}

function getClientGreeting() {
  return greetingForLocalHour(new Date().getHours())
}

function getServerGreeting() {
  return "Welcome."
}

export default function TimeOfDayGreeting({ as = "h1", className }: TimeOfDayGreetingProps) {
  const greeting = useSyncExternalStore(subscribe, getClientGreeting, getServerGreeting)
  const Heading = as

  return <Heading className={className}>{greeting}</Heading>
}
