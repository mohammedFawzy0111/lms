/** audit_log.action -> a phrase that follows the person's name ("Sara <phrase>"). */
export const ACTION_LABELS: Record<string, string> = {
  login: "signed in",
  logout: "signed out",
  password_changed: "changed their password",
  user_created: "created a user",
  user_activated: "enabled a user",
  user_deactivated: "disabled a user",
  patient_created: "registered a patient",
  patient_updated: "updated a patient",
  patient_deleted: "deleted a patient",
  request_created: "created a lab request",
  request_deleted: "deleted a lab request",
  request_status_changed: "changed a request's status",
  request_item_status_changed: "changed a test's status",
  results_finalized: "finalized results",
  investigation_created: "added a test",
  investigation_updated: "edited a test",
  investigation_deleted: "removed a test",
  profile_created: "added a test profile",
  profile_updated: "edited a test profile",
  profile_deleted: "removed a test profile",
  invoice_created: "created an invoice",
  invoice_adjusted: "adjusted an invoice",
  payment_recorded: "recorded a payment",
};

export function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

/** Pending rows requested from the backend (one per test). */
export const PENDING_FETCH_LIMIT = 60;
export const QUEUE_VISIBLE = 8;
export const ACTIVITY_LIMIT = 12;
