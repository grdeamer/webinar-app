import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

export type BuiltInPageTemplate = {
  id: string
  name: string
  description: string
  sections_json: EventPageSection[]
  elements_json: []
  event_theme: EventTheme
  built_in: true
}

export const LETS_LIVE_AGENDA_TEMPLATE: BuiltInPageTemplate = {
  id: "builtin-lets-live-agenda",
  name: "LETS Live Agenda",
  description: "The production LETS attendee experience, powered by Jupiter runtime data.",
  built_in: true,
  elements_json: [],
  event_theme: {
    pageBackgroundColor: "#edf1f4",
    panelBackgroundColor: "#ffffff",
    panelBorderColor: "rgba(18,25,33,0.11)",
    textColor: "#11161c",
    gradientColorA: "#fafbfc",
    gradientColorB: "#e2e8ed",
    gradientAngle: "150deg",
  },
  sections_json: [
    {
      id: "lets-live-agenda",
      type: "system",
      config: {
        visible: true,
        adminLabel: "LETS Live Agenda Experience",
        backgroundStyle: "transparent",
        contentWidth: "full",
        paddingY: "sm",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "lets-live-agenda-block",
          type: "system_component",
          props: {
            componentKey: "lets_live_agenda",
            containerStyle: "none",
          },
        },
      ],
    },
  ],
}

export const BUILT_IN_PAGE_TEMPLATES = [LETS_LIVE_AGENDA_TEMPLATE]
