import { useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import { DuplicateNotice } from "./DuplicateNotice";
import type { DuplicateWarning, NewPatient, Patient } from "./types";

interface Props {
  patient: Patient | null;
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Form text state; converted to `NewPatient` (empty -> null) on submit. */
interface Draft {
  full_name: string;
  date_of_birth: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  email: string;
  referring_physician: string;
  notes: string;
}

const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

function toPayload(d: Draft): NewPatient {
  const age = parseInt(d.age, 10);
  return {
    full_name: d.full_name.trim(),
    date_of_birth: orNull(d.date_of_birth),
    // An estimated age only makes sense when there is no date of birth.
    age_override: d.date_of_birth || isNaN(age) ? null : age,
    gender: orNull(d.gender),
    phone: orNull(d.phone),
    address: orNull(d.address),
    email: orNull(d.email),
    referring_physician: orNull(d.referring_physician),
    notes: orNull(d.notes),
  };
}

export function PatientFormModal({ patient, actorId, onClose, onSaved }: Props) {
  const isEdit = !!patient;
  const [form, setForm] = useState<Draft>({
    full_name: patient?.full_name ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    age: patient?.age_override != null ? String(patient.age_override) : "",
    gender: patient?.gender ?? "",
    phone: patient?.phone ?? "",
    address: patient?.address ?? "",
    email: patient?.email ?? "",
    referring_physician: patient?.referring_physician ?? "",
    notes: patient?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // Any edit invalidates a previous duplicate check and its confirmation.
  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmed(false);
    setDuplicates([]);
  }

  /** Returns true when it is OK to save (no matches, or the check itself failed). */
  async function passesDuplicateCheck(): Promise<boolean> {
    if (isEdit) return true;
    try {
      const matches = await api<DuplicateWarning[]>("cmd_check_patient_duplicates", {
        fullName: form.full_name.trim(),
        phone: orNull(form.phone),
        dob: orNull(form.date_of_birth),
      });
      if (matches.length > 0) {
        setDuplicates(matches);
        return false;
      }
    } catch {
      /* fail open: a broken check shouldn't block registering a patient */
    }
    return true;
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      if (!confirmed && !(await passesDuplicateCheck())) return;
      const payload = toPayload(form);
      if (isEdit) {
        await api("cmd_update_patient", { actorId, id: patient!.id, patient: payload });
      } else {
        await api("cmd_create_patient", { actorId, patient: payload });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size="wide"
      onClose={onClose}
      title={isEdit ? `Edit Patient — ${patient!.patient_no}` : "New Patient"}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={submit} disabled={saving || !form.full_name.trim()}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Patient"}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        {duplicates.length > 0 && (
          <DuplicateNotice
            matches={duplicates}
            onCancel={() => setDuplicates([])}
            onContinue={() => {
              setConfirmed(true);
              setDuplicates([]);
            }}
          />
        )}

        <div className="modal-grid modal-grid--3">
          <Field label="Full Name *" span={2}>
            <input
              className="field__input"
              value={form.full_name}
              placeholder="Jane Doe"
              onChange={(e) => set("full_name", e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select className="field__input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>

          <Field label="Date of Birth">
            <input
              className="field__input"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </Field>
          <Field
            label={
              <>
                Age{" "}
                {form.date_of_birth ? (
                  <span className="cell-muted">(auto from DOB)</span>
                ) : (
                  "(if DOB unknown)"
                )}
              </>
            }
          >
            <input
              className="field__input"
              type="number"
              min={0}
              max={150}
              value={form.date_of_birth ? "" : form.age}
              placeholder="e.g. 45"
              disabled={!!form.date_of_birth}
              onChange={(e) => set("age", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className="field__input"
              value={form.phone}
              placeholder="+1 555 000 0000"
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>

          <Field label="Email">
            <input
              className="field__input"
              type="email"
              value={form.email}
              placeholder="jane@example.com"
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Address" span={2}>
            <input
              className="field__input"
              value={form.address}
              placeholder="123 Main St"
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <Field label="Referring Physician">
            <input
              className="field__input"
              value={form.referring_physician}
              placeholder="Dr. Smith"
              onChange={(e) => set("referring_physician", e.target.value)}
            />
          </Field>
          <Field label="Notes" span={3}>
            <textarea
              className="field__input field__textarea"
              value={form.notes}
              placeholder="Optional notes..."
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
