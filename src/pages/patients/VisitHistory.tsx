import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { api, errMsg } from "../../lib/api";
import { dateOnly } from "../../lib/format";
import { STATUS_LABELS, STATUS_TONES } from "../requests/constants";
import type { LabRequest } from "../requests/types";
import type { Patient } from "./types";

/** Lists this patient's lab requests, newest first. */
export function VisitHistory({ patient }: { patient: Patient }) {
  const [rows, setRows] = useState<LabRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // The list command searches by patient number; keep only exact patient matches
    // (a search for P-0001 would also match P-00010).
    api<LabRequest[]>("cmd_list_requests", { status: null, search: patient.patient_no, limit: 100 })
      .then((all) => live && setRows(all.filter((r) => r.patient_id === patient.id)))
      .catch((e) => live && setError(errMsg(e)));
    return () => {
      live = false;
    };
  }, [patient.id, patient.patient_no]);

  if (error) return <div className="error">{error}</div>;
  if (!rows) return <div className="loading">Loading...</div>;
  if (rows.length === 0) {
    return (
      <div className="visits-empty">
        <p>No visits yet</p>
        <p className="visits-empty__sub">Lab requests for this patient will appear here.</p>
      </div>
    );
  }

  return (
    <table className="mini-table">
      <thead>
        <tr>
          <th>Request #</th>
          <th>Date</th>
          <th>Tests</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="cell-id">{r.request_no}</td>
            <td className="cell-muted nowrap">{dateOnly(r.request_date)}</td>
            <td>{r.item_count}</td>
            <td>
              <StatusBadge tone={STATUS_TONES[r.status] ?? "default"}>
                {STATUS_LABELS[r.status] ?? r.status}
              </StatusBadge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
