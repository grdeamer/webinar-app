import { z } from "zod"

export const legacyEventLiveModeSchema = z.enum([
  "lobby",
  "general",
  "breakout",
  "networking",
  "ondemand",
])

export const updateLegacyEventLiveStateSchema = z.object({
  eventId: z.string().min(1),
  mode: legacyEventLiveModeSchema,
  breakoutId: z.string().nullable().optional(),
  forceRedirect: z.boolean().optional(),
})

export type UpdateLegacyEventLiveStateInput = z.infer<
  typeof updateLegacyEventLiveStateSchema
>