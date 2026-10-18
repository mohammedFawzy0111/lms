import type { Tone } from "../../components/ui/StatusBadge";

export const TEXT_OPTIONS = ["Positive", "Negative", "Reactive", "Non-Reactive", "Present", "Absent"];

/** Abnormal flags only; "normal" is shown as a plain check mark. */
export const FLAGS: Record<string, { label: string; title: string; tone: Tone }> = {
  low: { label: "L", title: "Low", tone: "info" },
  high: { label: "H", title: "High", tone: "warning" },
  critical_low: { label: "CL", title: "Critical low", tone: "danger" },
  critical_high: { label: "CH", title: "Critical high", tone: "danger" },
};
