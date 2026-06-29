import type { SystemComponentKey } from "@/lib/page-editor/sectionTypes"
export type SystemComponentCategory =
  | "live"
  | "registration"
  | "content"
  | "engagement"
  | "broadcast"
  | "layout";

export interface SystemComponentDefinition {
  key: SystemComponentKey;
  label: string;
  category: SystemComponentCategory;
  description?: string;
}

export const SYSTEM_COMPONENTS: SystemComponentDefinition[] = [
  {
    key: "stage_player",
    label: "Stage Player",
    category: "broadcast",
    description: "Primary live video playback surface.",
  },
  {
    key: "countdown",
    label: "Countdown",
    category: "live",
    description: "Displays countdown to event start.",
  },
  {
    key: "sessions_list",
    label: "Sessions List",
    category: "content",
    description: "Displays agenda and session schedule.",
  },
  {
    key: "registration_form",
    label: "Registration Form",
    category: "registration",
    description: "Primary attendee registration experience.",
  },
  {
  key: "registration_status",
  label: "Registration Status",
  category: "registration",
  description: "Displays attendee registration state.",
},
{
  key: "approval_gate",
  label: "Approval Gate",
  category: "registration",
  description: "Controls approval-only access.",
},
{
  key: "waitlist_status",
  label: "Waitlist Status",
  category: "registration",
  description: "Displays attendee waitlist state.",
},
{
  key: "attendee_badge",
  label: "Attendee Badge",
  category: "engagement",
  description: "Displays attendee identity and status.",
},
  {
    key: "join_button",
    label: "Join Button",
    category: "live",
    description: "Context-aware event join action.",
  },
];
