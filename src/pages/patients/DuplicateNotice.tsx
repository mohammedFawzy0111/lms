import type { DuplicateWarning } from "./types";

interface Props {
  matches: DuplicateWarning[];
  onCancel: () => void;
  onContinue: () => void;
}

export function DuplicateNotice({ matches, onCancel, onContinue }: Props) {
  return (
    <div className="dupe-warning">
      <strong>
        Heads up - found {matches.length} possible match{matches.length > 1 ? "es" : ""}:
      </strong>
      <p className="dupe-warning__hint">
        This could be the same person, or a different family member sharing contact info. Review before continuing.
      </p>
      <ul>
        {matches.map((d) => (
          <li key={d.patient_id}>
            {d.full_name} ({d.patient_no}) — matched on{" "}
            {d.matched_on === "phone" ? "same phone number" : "same name & date of birth"}
          </li>
        ))}
      </ul>
      <div className="dupe-warning__actions">
        <button className="action-btn" onClick={onCancel}>Cancel</button>
        <button className="save-btn" onClick={onContinue}>Continue Anyway</button>
      </div>
    </div>
  );
}
