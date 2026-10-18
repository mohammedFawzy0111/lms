import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export interface NoticeProps {
  tone: "success" | "error";
  children: ReactNode;
}

/** Inline banner for the outcome of an action. */
export function Notice({ tone, children }: NoticeProps) {
  return (
    <div className={`error notice${tone === "success" ? " error--success" : ""}`} role="status">
      {tone === "success" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {children}
    </div>
  );
}
