import type { Tone } from "../../components/ui/StatusBadge";

export const STATUSES = ["unpaid", "partial", "paid"];

export const STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

export const STATUS_TONES: Record<string, Tone> = {
  unpaid: "danger",
  partial: "warning",
  paid: "success",
  cancelled: "default",
};

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];
