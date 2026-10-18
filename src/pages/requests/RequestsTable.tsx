import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { dateOnly } from "../../lib/format";
import { STATUS_LABELS, STATUS_TONES } from "./constants";
import type { LabRequest } from "./types";

interface Props {
  rows: LabRequest[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onView: (id: string) => void;
  onResults: (id: string) => void;
  onPrint: (id: string) => void;
}

export function RequestsTable({
  rows,
  loading,
  selectedIds,
  onToggle,
  onToggleAll,
  onView,
  onResults,
  onPrint,
}: Props) {
  return (
    <DataTable
      rows={rows}
      loadingState={loading}
      getRowKey={(r) => r.id}
      rowClassName={(r) => (selectedIds.has(r.id) ? "row--selected" : undefined)}
      emptyState="No requests found."
      columns={[
        {
          key: "select",
          className: "col-check",
          header: (
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === rows.length}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
          ),
          cell: (r) => (
            <input
              type="checkbox"
              checked={selectedIds.has(r.id)}
              onChange={() => onToggle(r.id)}
            />
          ),
        },
        { key: "request_no", header: "Request #", cell: (r) => <span className="font-mono">{r.request_no}</span> },
        {
          key: "patient_name",
          header: "Patient",
          cell: (r) => (
            <div className="user-cell">
              <div className="user-avatar">{r.patient_name.charAt(0).toUpperCase()}</div>
              <div className="cell-stack">
                <span>{r.patient_name}</span>
                <span className="cell-id">{r.patient_no}</span>
              </div>
            </div>
          ),
        },
        {
          key: "item_count",
          header: "Tests",
          cell: (r) => (
            <span className="badge-count">
              {r.item_count} test{r.item_count !== 1 ? "s" : ""}
            </span>
          ),
        },
        {
          key: "priority",
          header: "Priority",
          cell: (r) =>
            r.priority === "urgent" ? (
              <StatusBadge tone="danger">Urgent</StatusBadge>
            ) : (
              <span className="cell-muted">Normal</span>
            ),
        },
        {
          key: "status",
          header: "Status",
          cell: (r) => (
            <StatusBadge tone={STATUS_TONES[r.status] ?? "default"}>
              {STATUS_LABELS[r.status] ?? r.status}
            </StatusBadge>
          ),
        },
        { key: "request_date", header: "Requested", className: "col-hide-sm", cell: (r) => <span className="cell-muted nowrap">{dateOnly(r.request_date)}</span> },
        {
          key: "actions",
          header: "Actions",
          cell: (r) => (
            <div className="row-actions">
              <button className="action-btn" onClick={() => onView(r.id)}>View</button>
              <button className="action-btn" onClick={() => onResults(r.id)}>Results</button>
              <button className="action-btn" onClick={() => onPrint(r.id)}>Print</button>
            </div>
          ),
        },
      ]}
    />
  );
}
