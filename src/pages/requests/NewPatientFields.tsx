import { Field } from "../../components/ui/Field";
import type { NewPatientForm } from "./types";

interface Props {
  value: NewPatientForm;
  onChange: (patch: Partial<NewPatientForm>) => void;
}

/** Minimal registration fields shown when creating a request for a new patient. */
export function NewPatientFields({ value, onChange }: Props) {
  return (
    <div className="modal-grid modal-grid--3">
      <Field label="Full Name *" span={2}>
        <input
          className="field__input"
          value={value.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          placeholder="Jane Doe"
        />
      </Field>
      <Field label="Gender">
        <select
          className="field__input"
          value={value.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </Field>
      <Field label="Date of Birth">
        <input
          className="field__input"
          type="date"
          value={value.date_of_birth}
          onChange={(e) => onChange({ date_of_birth: e.target.value })}
        />
      </Field>
      <Field label={`Age ${value.date_of_birth ? "(auto)" : "(if DOB unknown)"}`}>
        <input
          className="field__input"
          type="number"
          disabled={!!value.date_of_birth}
          value={value.age_override ?? ""}
          onChange={(e) =>
            onChange({
              age_override: e.target.value === "" ? null : parseInt(e.target.value, 10),
            })
          }
        />
      </Field>
      <Field label="Phone">
        <input
          className="field__input"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </Field>
    </div>
  );
}
