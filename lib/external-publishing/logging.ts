type PublishLogLevel = "info" | "error"

export function logPublishingEvent(
  level: PublishLogLevel,
  action: string,
  details: Record<string, unknown>,
) {
  const payload = {
    area: "external-publishing",
    action,
    ...details,
  }
  if (level === "error") console.error("[external-publishing]", payload)
  else console.info("[external-publishing]", payload)
}
