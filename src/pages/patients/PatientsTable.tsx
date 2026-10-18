import { DataTable } from "../../components/ui/CustomTable";
import { dateOnly } from "../../lib/format";
import { calcAge } from "./age";
import type { Patient } from "./types";

interface Props {
  rows: Patient[];
  loading: boolean;
  onView: (p: Patient) => void;
  onEdit: (p: Patient) => void;
  onDelete: (p: Patient) => void;
}

export function PatientsTable({ rows, loading, onView, onEdit, onDelete }: Props) {
  return (
    <DataTable
      rows={rows}
      loadingState={loading}
      getRowKey={(p) => p.id}
      emptyState="No patients found."
      columns={[
        { key: "patient_no", header: "Patient ID", cell: (p) => <span className="font-mono cell-muted">{p.patient_no}</span> },
        {
          key: "full_name",
          header: "Name",
          cell: (p) => (
            <div className="user-cell">
              <div className="user-avatar">{p.full_name.charAt(0).toUpperCase()}</div>
              <span>{p.full_name}</span>
            </div>
          ),
        },
        {
          key: "age_gender",
          header: "Age / Gender",
          cell: (p) => (
            <span className="cell-muted nowrap">
              {calcAge(p)}
              {p.gender && <span className="capitalize"> · {p.gender}</span>}
            </span>
          ),
        },
        { key: "phone", header: "Phone", className: "col-hide-sm", cell: (p) => <span className="cell-muted nowrap">{p.phone || "—"}</span> },
        { key: "referring_physician", header: "Physician", className: "col-hide-sm", cell: (p) => <span className="cell-muted">{p.referring_physician || "—"}</span> },
        { key: "created_at", header: "Registered", className: "col-hide-sm", cell: (p) => <span className="cell-muted nowrap">{dateOnly(p.created_at)}</span> },
        {
          key: "actions",
          header: "Actions",
          cell: (p) => (
            <div className="row-actions">
              <button className="action-btn" onClick={() => onView(p)}>View</button>
              <button className="action-btn" onClick={() => onEdit(p)}>Edit</button>
              <button className="action-btn" onClick={() => onDelete(p)}>Delete</button>
            </div>
          ),
        },
      ]}
    />
  );
}
