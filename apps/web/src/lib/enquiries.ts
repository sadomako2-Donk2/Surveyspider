// Enquiry options and labels, shared by forms (browser) and server checks.
import { ANALYTICS_SERVICES, BUDGETS, CONSULT_SERVICES, TIMELINES, TRAINING_SERVICES } from "@/content/pages";

export const ENQUIRY_TYPES = ["ANALYTICS", "CONSULTANCY", "TRAINING", "CONTACT"] as const;
export type EnquiryTypeCode = (typeof ENQUIRY_TYPES)[number];
export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "IN_PROGRESS", "WON", "CLOSED"] as const;
export type EnquiryStatusCode = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_TYPE_LABEL: Record<EnquiryTypeCode, string> = {
  ANALYTICS: "Data analysis",
  CONSULTANCY: "Consultancy",
  TRAINING: "Training",
  CONTACT: "General",
};
/** Labels for the admin inbox. */
export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatusCode, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  IN_PROGRESS: "In progress",
  WON: "Won",
  CLOSED: "Closed",
};
/** Friendlier labels for the person who sent it. */
export const ENQUIRY_STATUS_FOR_SENDER: Record<EnquiryStatusCode, string> = {
  NEW: "Received",
  CONTACTED: "We've been in touch",
  IN_PROGRESS: "In progress",
  WON: "Agreed",
  CLOSED: "Closed",
};

export const SERVICES: Record<EnquiryTypeCode, readonly string[]> = {
  ANALYTICS: ANALYTICS_SERVICES,
  CONSULTANCY: CONSULT_SERVICES,
  TRAINING: TRAINING_SERVICES,
  CONTACT: [],
};
/** Which forms ask about timeline and budget. */
export const ASKS_BUDGET: Record<EnquiryTypeCode, boolean> = {
  ANALYTICS: true,
  CONSULTANCY: true,
  TRAINING: false,
  CONTACT: false,
};
export { BUDGETS, TIMELINES };
