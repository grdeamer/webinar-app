"use client"

import { JupiterAppearanceSwitch, useJupiterAppearance } from "@/components/ui/JupiterAppearance"

export default function IoAppearanceSwitch() {
  const appearance = useJupiterAppearance()
  return <JupiterAppearanceSwitch appearance={appearance} compact />
}
