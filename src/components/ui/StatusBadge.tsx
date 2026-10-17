import type { ReactNode } from "react";

export type Tone = "default" | "info" | "success" | "warning" | "danger";

export interface StatusBadgeProps {
  tone?: Tone;
  children: ReactNode;
}

export function StatusBadge({ tone = "default", children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
