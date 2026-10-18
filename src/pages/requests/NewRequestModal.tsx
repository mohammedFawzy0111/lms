import { useEffect, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Segmented } from "../../components/ui/Segmented";
import { api, errMsg } from "../../lib/api";
import { NewPatientFields } from "./NewPatientFields";
import { PatientPicker } from "./PatientPicker";
import { TestPicker } from "./TestPicker";
import { EMPTY_NEW_PATIENT } from "./types";
import type {
  NewPatientForm,
  PatientHit,
  ProfileOption,
  ProfileSummary,
  TestOption,
} from "./types";

interface Props {
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}

type Mode = "existing" | "new";

/** Everything the backend needs besides who the patient is. */
const emptyOrder = { priority: "normal", collectionDate: "", dueDate: "", notes: "" };

export function NewRequestModal({ actorId, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<Mode>("existing");
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [newPatient, setNewPatient] = useState<NewPatientForm>(EMPTY_NEW_PATIENT);
  const [order, setOrder] = useState(emptyOrder);

  const [tests, setTests] = useState<TestOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the pickable tests, then expand each active profile into its (active) test ids.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [allTests, list] = await Promise.all([
          api<TestOption[]>("cmd_list_investigations", {
            categoryId: null,
            search: null,
            includeInactive: false,
          }),
          api<ProfileSummary[]>("cmd_list_profiles"),
        ]);
        const activeIds = new Set(allTests.map((t) => t.id));
        const expanded = await Promise.all(
          list
            .filter((p) => p.is_active)
            .map(async (p) => {
              const detail = await api<{ investigation_ids: string[] }>("cmd_get_profile", {
                id: p.id,
              });
              return {
                id: p.id,
                name: p.name,
                description: p.description,
                test_count: p.test_count,
                investigation_ids: detail.investigation_ids.filter((id) => activeIds.has(id)),
              };
            }),
        );
        if (cancelled) return;
        setTests(allTests);
        setProfiles(expanded);
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProfile(p: ProfileOption) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = p.investigation_ids.every((id) => next.has(id));
      p.investigation_ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  const setOrderField = (patch: Partial<typeof emptyOrder>) =>
    setOrder((o) => ({ ...o, ...patch }));

  async function submit() {
    setError(null);
    if (selected.size === 0) return setError("Select at least one test");
    if (mode === "existing" && !patient) return setError("Select a patient");
    if (mode === "new" && !newPatient.full_name.trim()) return setError("Patient name is required");

    const shared = {
      investigation_ids: Array.from(selected),
      priority: order.priority,
      collection_date: order.collectionDate || null,
      due_date: order.dueDate || null,
      notes: order.notes || null,
    };

    setSaving(true);
    try {
      if (mode === "existing") {
        await api("cmd_create_request", {
          actorId,
          request: { patient_id: patient!.id, ...shared },
        });
      } else {
        await api("cmd_create_patient_with_request", {
          actorId,
          payload: {
            patient: {
              full_name: newPatient.full_name,
              date_of_birth: newPatient.date_of_birth || null,
              age_override: newPatient.age_override,
              gender: newPatient.gender || null,
              phone: newPatient.phone || null,
              address: null,
              email: null,
              referring_physician: null,
              notes: null,
            },
            ...shared,
          },
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      size="wide"
      title="New Lab Request"
      onClose={onClose}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create Request"}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "existing", label: "Existing Patient" },
            { value: "new", label: "Register New Patient" },
          ]}
        />

        {mode === "existing" ? (
          <PatientPicker selected={patient} onSelect={setPatient} />
        ) : (
          <NewPatientFields
            value={newPatient}
            onChange={(patch) => setNewPatient((p) => ({ ...p, ...patch }))}
          />
        )}

        <div className="modal-grid">
          <Field label="Priority">
            <select
              className="field__input"
              value={order.priority}
              onChange={(e) => setOrderField({ priority: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Collection Date">
            <input
              className="field__input"
              type="date"
              value={order.collectionDate}
              onChange={(e) => setOrderField({ collectionDate: e.target.value })}
            />
          </Field>
          <Field label="Due Date">
            <input
              className="field__input"
              type="date"
              value={order.dueDate}
              onChange={(e) => setOrderField({ dueDate: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <input
              className="field__input"
              value={order.notes}
              onChange={(e) => setOrderField({ notes: e.target.value })}
            />
          </Field>
        </div>

        <TestPicker
          tests={tests}
          profiles={profiles}
          selected={selected}
          onToggleTest={toggleTest}
          onToggleProfile={toggleProfile}
        />
      </div>
    </Modal>
  );
}
