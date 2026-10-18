export interface DetailFieldProps {
  label: string;
  value: string;
  /** Title-case a status-like value such as "urgent". Leave off for free text. */
  capitalize?: boolean;
}

/** Read-only label/value pair for detail views. */
export function DetailField({ label, value, capitalize }: DetailFieldProps) {
  return (
    <div className="detail-field">
    <span className="detail-field__label">{label}</span>
    <span className={`detail-field__value${capitalize ? " capitalize" : ""}`}>{value}</span>
    </div>
  );
}
