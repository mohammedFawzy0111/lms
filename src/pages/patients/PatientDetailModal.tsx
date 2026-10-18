import { useState } from "react";
import { DetailField } from "../../components/ui/DetailField";
import { Modal } from "../../components/ui/Modal";
import { dateOnly } from "../../lib/format";
import { calcAge } from "./age";
import type { Patient } from "./types";
import { VisitHistory } from "./VisitHistory";

type Tab = "info" | "visits";

export function PatientDetailModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("info");

  return (
    <Modal
      size="wide"
      onClose={onClose}
      title={
        <>
          {patient.full_name} <span className="cell-id">· {patient.patient_no}</span>
        </>
      }
      footer={<button className="action-btn" onClick={onClose}>Close</button>}
    >
      <div className="detail-tabs">
        {(["info", "visits"] as const).map((t) => (
          <button
            key={t}
            className={`detail-tab ${tab === t ? "detail-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "info" ? "Patient Info" : "Visit History"}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <div className="detail-grid">
          <DetailField label="Age" value={calcAge(patient)} />
          <DetailField label="Gender" value={patient.gender ?? "—"} capitalize />
          <DetailField label="Phone" value={patient.phone ?? "—"} />
          <DetailField label="Email" value={patient.email ?? "—"} />
          <DetailField label="Referring Physician" value={patient.referring_physician ?? "—"} />
          <DetailField label="Registered" value={dateOnly(patient.created_at)} />
          <DetailField label="Address" value={patient.address ?? "—"} full />
          <DetailField label="Notes" value={patient.notes ?? "—"} full />
        </div>
      ) : (
        <VisitHistory patient={patient} />
      )}
    </Modal>
  );
}
