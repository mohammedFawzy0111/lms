import type { Tone } from "../../components/ui/StatusBadge";

export const STATUSES = [
  "pending",
  "sample_collected",
  "in_progress",
  "completed",
  "delivered",
  "cancelled",
];

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sample_collected: "Sample Collected",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_TONES: Record<string, Tone> = {
  pending: "default",
  sample_collected: "info",
  in_progress: "warning",
  completed: "success",
  delivered: "success",
  cancelled: "danger",
};
