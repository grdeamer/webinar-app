import type { WebinarRecord } from "@/lib/types"

export type SpeakerCard = {
  name: string
  role?: string | null
  company?: string | null
  bio?: string | null
  imageUrl?: string | null
}

function normalizeSpeakerCard(input: unknown): SpeakerCard | null {
  if (!input) return null

  if (typeof input === "object" && !Array.isArray(input)) {
    const value = input as {
      name?: unknown
      role?: unknown
      company?: unknown
      bio?: unknown
      imageUrl?: unknown
      image_url?: unknown
    }

    const name = String(value.name || "").trim()
    if (!name) return null

    return {
      name,
      role: cleanText(value.role),
      company: cleanText(value.company),
      bio: cleanText(value.bio),
      imageUrl: cleanText(value.imageUrl ?? value.image_url),
    }
  }

  if (typeof input !== "string") return null
  const line = input.trim()
  if (!line) return null

  if (line.includes("|")) {
    const [name, role, company, imageUrl, bio] = line.split("|").map((part) => part.trim())
    if (!name) return null
    return {
      name,
      role: cleanText(role),
      company: cleanText(company),
      imageUrl: cleanText(imageUrl),
      bio: cleanText(bio),
    }
  }

  const [namePart, rolePart] = line.split(/\s[-–—:]\s/, 2)
  const name = namePart?.trim()
  if (!name) return null
  return { name, role: cleanText(rolePart) }
}

export function parseSpeakerCards(...values: Array<unknown>): SpeakerCard[] {
  const seen = new Set<string>()
  const cards: SpeakerCard[] = []

  for (const value of values) {
    if (!value) continue

    if (Array.isArray(value)) {
      for (const entry of value) {
        const card = normalizeSpeakerCard(entry)
        if (!card) continue
        const key = card.name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        cards.push(card)
      }
      continue
    }

    if (typeof value === "string" && value.includes("\n")) {
      for (const line of value.split("\n")) {
        const card = normalizeSpeakerCard(line)
        if (!card) continue
        const key = card.name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        cards.push(card)
      }
      continue
    }

    if (typeof value === "string" && !value.includes("|") && value.includes(",")) {
      for (const chunk of value.split(",")) {
        const card = normalizeSpeakerCard(chunk)
        if (!card) continue
        const key = card.name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        cards.push(card)
      }
      continue
    }

    const card = normalizeSpeakerCard(value)
    if (!card) continue
    const key = card.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cards.push(card)
  }

  return cards
}

export function serializeSpeakerCards(lines: string): SpeakerCard[] {
  return parseSpeakerCards(lines)
}

export function formatSpeakerCardsForEditor(cards: unknown): string {
  if (!Array.isArray(cards)) return ""
  return cards
    .map((card) => {
      const normalized = normalizeSpeakerCard(card)
      if (!normalized) return ""
      return [
        normalized.name,
        normalized.role || "",
        normalized.company || "",
        normalized.imageUrl || "",
        normalized.bio || "",
      ]
        .join(" | ")
        .replace(/\s+\|\s+\|\s+\|\s+$/, "")
        .replace(/\s+\|\s+\|\s+$/, "")
        .replace(/\s+\|\s+$/, "")
    })
    .filter(Boolean)
    .join("\n")
}

export function getPlaybackSource(webinar: Partial<WebinarRecord> | null | undefined) {
  const mp4 = cleanText(webinar?.playback_mp4_url)
  const hls = cleanText(webinar?.playback_m3u8_url)
  const playbackType = String(webinar?.playback_type || "").toLowerCase()

  if (playbackType === "hls" && hls) return { sourceType: "hls" as const, src: hls }
  if (playbackType === "mp4" && mp4) return { sourceType: "mp4" as const, src: mp4 }
  if (hls) return { sourceType: "hls" as const, src: hls }
  if (mp4) return { sourceType: "mp4" as const, src: mp4 }
  return null
}

function cleanText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}