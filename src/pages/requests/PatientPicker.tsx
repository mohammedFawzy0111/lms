import { useEffect, useRef, useState } from "react";
import { Field } from "../../components/ui/Field";
import { api } from "../../lib/api";
import type { PatientHit } from "./types";

interface Props {
  selected: PatientHit | null;
  onSelect: (patient: PatientHit | null) => void;
}

/** Search-as-you-type picker for an existing patient. */
export function PatientPicker({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const id = ++seq.current;
      try {
        const rows = await api<PatientHit[]>("cmd_search_patients", { query, limit: 10 });
        if (id === seq.current) setResults(rows);
      } catch {
        if (id === seq.current) setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function choose(p: PatientHit) {
    onSelect(p);
    setQuery("");
    setResults([]);
  }

  return (
    <Field label="Search Patient">
      {selected ? (
        <div className="selected-patient">
          <span>
            {selected.full_name} <span className="cell-id">({selected.patient_no})</span>
          </span>
          <button className="action-btn" onClick={() => onSelect(null)}>
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            className="field__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type name, ID, or phone..."
          />
          {results.length > 0 && (
            <div className="patient-results">
              {results.map((p) => (
                <div key={p.id} className="patient-results__item" onClick={() => choose(p)}>
                  {p.full_name} <span className="cell-id">({p.patient_no})</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Field>
  );
}
