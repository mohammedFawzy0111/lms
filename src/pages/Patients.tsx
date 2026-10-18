import { useEffect, useState } from "react";
import { Page } from "../components/ui/Page";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { PatientDetailModal } from "./patients/PatientDetailModal";
import { PatientFormModal } from "./patients/PatientFormModal";
import { PatientsTable } from "./patients/PatientsTable";
import type { Patient } from "./patients/types";
import { usePatientList } from "./patients/usePatientList";
import "./styles/Patients.css";

export default function Patients() {
  const actorId = useAuthStore((s) => s.session?.user.id ?? "");
  const { patients, loading, error, setError, load, reload } = usePatientList();

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Patient | "new" | null>(null);
  const [detail, setDetail] = useState<Patient | null>(null);

  // Debounced fetch whenever the query changes (also runs on first mount).
  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  async function handleDelete(p: Patient) {
    if (!actorId) return;
    if (!confirm(`Delete patient ${p.full_name} (${p.patient_no})? This cannot be undone.`)) return;
    try {
      await api("cmd_delete_patient", { actorId, id: p.id });
      reload();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <Page
      title="Patients"
      subtitle={`${patients.length} patient${patients.length !== 1 ? "s" : ""}`}
      actionBtn={
        <button className="save-btn" onClick={() => setForm("new")}>
          + New Patient
        </button>
      }
    >
      <div className="toolbar">
        <input
          className="field__input search"
          placeholder="Search by name, patient ID, or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <PatientsTable rows={patients} loading={loading} onView={setDetail} onEdit={setForm} onDelete={handleDelete} />

      {form && (
        <PatientFormModal
          patient={form === "new" ? null : form}
          actorId={actorId}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
      {detail && <PatientDetailModal patient={detail} onClose={() => setDetail(null)} />}
    </Page>
  );
}
