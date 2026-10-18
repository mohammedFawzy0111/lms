import { STATUSES, STATUS_LABELS } from "./constants";

export function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: string) => void;
}) {
  return (
    <select className="field__input" value={value} onChange={(e) => onChange(e.target.value)}>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
