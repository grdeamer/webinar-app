export type RegistrationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "approved"
  | "waitlisted"
  | "cancelled";

export type RegistrationFieldType =
  | "text"
  | "email"
  | "select"
  | "checkbox"
  | "radio"
  | "textarea";

export interface RegistrationField {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required?: boolean;
  options?: string[];
}

export interface RegistrationFlow {
  id: string;
  title: string;
  status: RegistrationStatus;
  fields: RegistrationField[];
}