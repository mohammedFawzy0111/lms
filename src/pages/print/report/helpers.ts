import type { ReportResult } from "./types";

export type FlagKind = "high" | "low" | "critical";

/** Abnormal flags only. The arrows and words keep them readable on a black-and-white printout. */
export const FLAG_INFO: Record<string, { label: string; mark: string; kind: FlagKind; remark: string }> = {
  high: { label: "High", mark: "▲", kind: "high", remark: "elevated" },
  low: { label: "Low", mark: "▼", kind: "low", remark: "low" },
  critical_high: { label: "Critical high", mark: "▲▲", kind: "critical", remark: "critically elevated" },
  critical_low: { label: "Critical low", mark: "▼▼", kind: "critical", remark: "critically low" },
};

export const isAbnormal = (r: ReportResult) => !!r.flag && r.flag !== "normal" && !!FLAG_INFO[r.flag];

export const hasValue = (r: ReportResult) => r.numeric_value != null || !!r.text_value;

export function valueText(r: ReportResult): string {
  if (r.numeric_value != null) return String(r.numeric_value);
  return r.text_value || "Pending";
}

export function rangeText(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min} – ${max}`;
  if (min != null) return `≥ ${min}`;
  if (max != null) return `≤ ${max}`;
  return "—";
}

/** A report is final only when every test has a saved, non-draft value. */
export function reportStatus(results: ReportResult[]): "final" | "preliminary" {
  return results.length > 0 && results.every((r) => !r.is_draft && hasValue(r)) ? "final" : "preliminary";
}

export interface ResultGroup {
  name: string;
  items: ReportResult[];
}

/** Group by category, keeping the order tests were requested in. */
export function groupByCategory(results: ReportResult[]): ResultGroup[] {
  const groups: ResultGroup[] = [];
  for (const r of results) {
    const name = r.category_name ?? "General";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(r);
  }
  return groups;
}
