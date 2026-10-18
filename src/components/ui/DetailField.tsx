export interface DetailFieldProps {
  label: string;
  value: string;
  /** Title-case a status-like value such as "urgent". Leave off for free text. */
  capitalize?: boolean;
  /** Span the whole row of a `.detail-grid`. */
  full?: boolean;
}

/** Read-only label/value pair for detail views. */
export function DetailField({ label, value, capitalize, full }: DetailFieldProps) {
  return (
    <div className={`detail-field${full ? " detail-field--full" : ""}`}>
    <span className="detail-field__label">{label}</span>
    <span className={`detail-field__value${capitalize ? " capitalize" : ""}`}>{value}</span>
    </div>
  );
}
