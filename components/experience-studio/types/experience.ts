export type ExperienceState =
  | "draft"
  | "published"
  | "registered"
  | "approved"
  | "live"
  | "replay"
  | "expired";

export type ExperienceSectionType =
  | "hero"
  | "content"
  | "system"
  | "grid"
  | "registration";

export interface Experience {
  id: string;
  slug: string;
  title: string;
  state: ExperienceState;
  sections: ExperienceSection[];
}

export interface ExperienceSection {
  id: string;
  type: ExperienceSectionType;
  visible?: boolean;
  blocks?: ExperienceBlock[];
}

export interface ExperienceBlock {
  id: string;
  type: string;
}