import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../stores/authStore";
import "./styles/Dashboard.css";
import "./styles/Patients.css";
import { Page } from "../components/ui/Page";

interface Patient {
  id: string;
  patient_no: string;
  full_name: string;
  date_of_birth: string | null;
  age_override: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  referring_physician: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface NewPatient {
  full_name: string;
  date_of_birth: string | null;
  age_override: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  referring_physician: string | null;
  notes: string | null;
}

interface DuplicateWarning {
  patient_id: string;
  patient_no: string;
  full_name: string;
  matched_on: string;
}

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

function calcAge(p: Patient): string {
  if (p.date_of_birth) {
    const birth = new Date(p.date_of_birth);
    if (isNaN(birth.getTime())) return "—";
    const diff = Date.now() - birth.getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    return `${years}y`;
  }
  if (p.age_override != null) return `${p.age_override}y (est.)`;
  return "-";
}

export default function Patients() {
  const currentUser = useAuthStore((s) => s.session?.user);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<Patient | null | "new">(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const cmd = q.trim() ? "cmd_search_patients" : "cmd_list_patients";
      const args = q.trim() ? { query: q.trim(), limit: 100 } : { limit: 100, offset: 0 };
      const res = await invoke<ApiResult<Patient[]>>(cmd, args);
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load");
      setPatients(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  async function handleDelete(p: Patient) {
    if (!currentUser) return;
    if (!confirm(`Delete patient ${p.full_name} (${p.patient_no})? This cannot be undone.`)) return;
    try {
      await invoke("cmd_delete_patient", { actorId: currentUser.id, id: p.id });
      load(query);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Page 
    title="Patients"
    subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""}`}
    actionBtn={
        <button className="save-btn" onClick={() => setShowForm("new")}>
          + New Patient
        </button>
    }>

      <input
        className="field__input patients-search"
        placeholder="Search by name, patient ID, or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <div className="users-error">{error}</div>}

      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loading">Loading...</div>
        ) : patients.length === 0 ? (
          <div className="users-loading">No patients found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Age / Gender</th>
                <th>Phone</th>
                <th>Physician</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{p.patient_no}</span></td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{p.full_name.charAt(0).toUpperCase()}</div>
                      <span>{p.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {calcAge(p)}{p.gender ? ` · ${p.gender}` : ""}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.phone || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.referring_physician || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.created_at.split(" ")[0]}</td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => setDetailPatient(p)}>View</button>
                      <button className="action-btn" onClick={() => setShowForm(p)}>Edit</button>
                      <button className="action-btn" onClick={() => handleDelete(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PatientFormModal
          patient={showForm === "new" ? null : showForm}
          actorId={currentUser?.id ?? ""}
          onClose={() => setShowForm(null)}
          onSaved={() => load(query)}
        />
      )}
      {detailPatient && (
        <PatientDetailModal patient={detailPatient} onClose={() => setDetailPatient(null)} />
      )}
    </Page>
  );
}

// ── Create/Edit Modal ──────────────────────────────────────────────────────────

function PatientFormModal({ patient, actorId, onClose, onSaved }: {
  patient: Patient | null;
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!patient;
  const [form, setForm] = useState<NewPatient>({
    full_name: patient?.full_name ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    age_override: patient?.age_override ?? null,
    gender: patient?.gender ?? "",
    phone: patient?.phone ?? "",
    address: patient?.address ?? "",
    email: patient?.email ?? "",
    referring_physician: patient?.referring_physician ?? "",
    notes: patient?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  function set(k: keyof NewPatient, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
    setConfirmed(false);
  }

  function setAge(v: string) {
    setForm((p) => ({ ...p, age_override: v === "" ? null : parseInt(v, 10) }));
    setConfirmed(false);
  }

  async function checkDupes(): Promise<boolean> {
    if (isEdit) return true; // skip dupe check on edit
    try {
      const res = await invoke<ApiResult<DuplicateWarning[]>>("cmd_check_patient_duplicates", {
        fullName: form.full_name,
        phone: form.phone || null,
        dob: form.date_of_birth || null,
      });
      if (res.ok && res.data && res.data.length > 0) {
        setDuplicates(res.data);
        return false;
      }
      return true;
    } catch {
      return true; // fail open
    }
  }

  async function submit() {
    setError(null);

    if (!confirmed) {
      const clear = await checkDupes();
      if (!clear) return; // show warning, wait for confirm
    }

    setLoading(true);
    try {
      const cmd = isEdit ? "cmd_update_patient" : "cmd_create_patient";
      const args = isEdit
        ? { actorId, id: patient!.id, patient: form }
        : { actorId, patient: form };

      const res = await invoke<ApiResult<Patient>>(cmd, args);
      if (!res.ok) throw new Error(res.error ?? "Failed to save");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          {isEdit ? `Edit Patient — ${patient!.patient_no}` : "New Patient"}
        </div>
        <div className="modal__body">
          {error && <div className="users-error" style={{ marginBottom: 12 }}>{error}</div>}

          {duplicates.length > 0 && !confirmed && (
            <div className="dupe-warning">
              <strong>Heads up - found {duplicates.length} possible match{duplicates.length > 1 ? "es" : ""}:</strong>
              <p style={{ margin: "4px 0 8px", color: "var(--text-muted)" }}>
                This could be the same person, or a diffrent family member sharing contact info. Review before continuing.
              </p>
              <ul>
                {duplicates.map((d) => (
                  <li key={d.patient_id}>
                    {d.full_name} ({d.patient_no}) — matched on {d.matched_on == "phone" ? "same phone number" : "same name & date of birth"}
                  </li>
                ))}
              </ul>
              <div className="dupe-warning__actions">
                <button className="action-btn" onClick={() => setDuplicates([])}>Cancel</button>
                <button
                  className="save-btn"
                  onClick={() => { setConfirmed(true); setDuplicates([]); }}
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          )}

          <div className="modal-grid modal-grid--3">
            <div className="field field--span2">
              <label className="field__label">Full Name *</label>
              <input className="field__input" value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Doe" />
            </div>

            <div className="field">
              <label className="field__label">Gender</label>
              <select className="field__input" value={form.gender ?? ""}
                onChange={(e) => set("gender", e.target.value)}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label">Date of Birth</label>
              <input className="field__input" type="date" value={form.date_of_birth ?? ""}
                onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">
                Age {form.date_of_birth ? <span style={{ color: "var(--text-muted)" }}>(auto form DOB)</span> : "(if DOB unknown)"}
              </label>
              <input
                className="field__input"
                type="number"
                min={0}
                max={150}
                value={form.age_override ?? ""}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 45"
                disabled={!!form.date_of_birth}
              />
            </div>

            <div className="field">
              <label className="field__label">Phone</label>
              <input className="field__input" value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
            </div>

            <div className="field">
              <label className="field__label">Email</label>
              <input className="field__input" type="email" value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
            </div>

            <div className="field field--span2">
              <label className="field__label">Address</label>
              <input className="field__input" value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" />
            </div>

            <div className="field">
              <label className="field__label">Referring Physician</label>
              <input className="field__input" value={form.referring_physician ?? ""}
                onChange={(e) => set("referring_physician", e.target.value)} placeholder="Dr. Smith" />
            </div>

            <div className="field field--span3">
              <label className="field__label">Notes</label>
              <textarea className="field__input field__textarea" value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button
            className="save-btn"
            onClick={submit}
            disabled={loading || !form.full_name.trim()}
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}


function PatientDetailModal({ patient, onClose }: {
  patient: Patient;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"info" | "visits">("info");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          {patient.full_name} <span className="font-mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>· {patient.patient_no}</span>
        </div>

        <div className="detail-tabs">
          <button
            className={`detail-tab ${tab === "info" ? "detail-tab--active" : ""}`}
            onClick={() => setTab("info")}
          >
            Patient Info
          </button>
          <button
            className={`detail-tab ${tab === "visits" ? "detail-tab--active" : ""}`}
            onClick={() => setTab("visits")}
          >
            Visit History
          </button>
        </div>

        <div className="modal__body">
          {tab === "info" ? (
            <div className="detail-grid">
              <DetailField label="Age" value={calcAge(patient)} />
              <DetailField label="Gender" value={patient.gender ?? "—"} />
              <DetailField label="Phone" value={patient.phone ?? "—"} />
              <DetailField label="Email" value={patient.email ?? "—"} />
              <DetailField label="Address" value={patient.address ?? "—"} full />
              <DetailField label="Referring Physician" value={patient.referring_physician ?? "—"} />
              <DetailField label="Registered" value={patient.created_at.split(" ")[0]} />
              <DetailField label="Notes" value={patient.notes ?? "—"} full />
            </div>
          ) : (
            <div className="visits-empty">
              <p>No visits yet</p>
              <p className="visits-empty__sub">
                Lab requests and visit history will appear here once the Requests module is available.
              </p>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "field--span3" : ""} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
