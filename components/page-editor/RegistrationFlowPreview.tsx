"use client"
import type { ReactNode } from "react"
import RegistrationForm from "@/components/registration/RegistrationForm"
import { normalizeRegistrationConfig } from "@/lib/registration/schema"
type Props = { title?: string; body?: string; ctaLabel?: string; confirmationTitle?: string; confirmationBody?: string; initialFields?: unknown[]; previewState?: string; variant?: string; registrationSettings?: unknown; renderTitle?: (title: string) => ReactNode }
export default function RegistrationFlowPreview(props: Props) {
  const config = normalizeRegistrationConfig({ ...props, registrationFields: props.initialFields })
  const sessions = config.sessions.map((s, i) => ({ id: s.id, title: s.title || `Session ${i + 1}` }))
  return <RegistrationForm preview config={config} sessions={sessions} previewState={props.previewState} renderPreviewTitle={props.renderTitle} />
}
