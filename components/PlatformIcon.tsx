import React from "react"
import { detectMeetingPlatform, type MeetingPlatform } from "@/lib/meetingPlatform"

interface PlatformIconProps {
  url?: string | null
  platform?: MeetingPlatform
  size?: number
  className?: string
}

export function PlatformIcon({ url, platform, size = 24, className = "" }: PlatformIconProps) {
  const detectedPlatform = platform || detectMeetingPlatform(url)

  const getIcon = (platform: MeetingPlatform) => {
    const iconSize = size
    
    switch (platform) {
      case "zoom":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <rect x="3" y="7" width="13" height="10" rx="2" />
            <path d="M16 9l5-3v12l-5-3" />
          </svg>
        )
      case "teams":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <rect x="4" y="6" width="10" height="12" rx="1" />
            <path d="M7 10h5" />
            <path d="M9.5 10v5" />
            <circle cx="18" cy="7" r="2" />
            <path d="M15.5 17v-3a2.5 2.5 0 0 1 5 0v3" />
          </svg>
        )
      case "webex":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <path d="M5.2 8.2A8 8 0 0 1 18 5.5" />
            <path d="M18.8 15.8A8 8 0 0 1 6 18.5" />
            <path d="m18 4 .2 3-3-.2" />
            <path d="M6 20l-.2-3 3 .2" />
          </svg>
        )
      case "meet":
      case "google-meet":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <rect x="3" y="7" width="12" height="10" rx="2" />
            <path d="M17 10l4-3v10l-4-3" />
          </svg>
        )
      case "goto":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <path d="M8 7a5 5 0 0 1 8.5 3.5L19 8" />
            <path d="M19 8v5h-5" />
            <path d="M16 17a5 5 0 0 1-8.5-3.5L5 16" />
            <path d="M5 16v-5h5" />
          </svg>
        )
      case "ringcentral":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
          </svg>
        )
      case "chime":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9 11h6v2H9z" />
          </svg>
        )
      case "bluejeans":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <rect x="3" y="7" width="13" height="10" rx="2" />
            <path d="M16 9l5-3v12l-5-3" />
          </svg>
        )
      case "other":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: iconSize, height: iconSize }}>
            <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
            <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
          </svg>
        )
      default:
        return null
    }
  }

  const icon = getIcon(detectedPlatform)

  if (!icon) return null

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {icon}
    </div>
  )
}