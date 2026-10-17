import type { ReactNode } from "react";

export interface FieldProps {
  label?: ReactNode;
  /** Columns to span inside a `.modal-grid` (2 or 3). */
  span?: 2 | 3;
  children: ReactNode;
}

/** Label + control. The control itself keeps the `field__input` class. */
export function Field({ label, span, children }: FieldProps) {
  return (
    <div className={`field${span ? ` field--span${span}` : ""}`}>
    {label && <label className="field__label">{label}</label>}
    {children}
    </div>
  );
}
