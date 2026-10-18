import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FLAGS, TEXT_OPTIONS } from "./constants";
import { isFinal, isNumeric, type Edit, type TestResult } from "./types";

interface Props {
  rows: TestResult[];
  editFor: (r: TestResult) => Edit;
  onEdit: (itemId: string, key: keyof Edit, value: string) => void;
  /** request_item_id being saved, "all" while finalizing, or null. */
  saving: string | null;
  onSave: (r: TestResult, isDraft: boolean) => void;
}

function FlagCell({ flag }: { flag: string | null }) {
  if (!flag) return <span className="cell-muted">—</span>;
  if (flag === "normal") return <span className="flag-ok" title="Normal">✓</span>;
  const f = FLAGS[flag];
  return f ? <StatusBadge tone={f.tone}>{f.label}</StatusBadge> : <span className="cell-muted">{flag}</span>;
}

export function ResultsTable({ rows, editFor, onEdit, saving, onSave }: Props) {
  return (
    <DataTable
      rows={rows}
      getRowKey={(r) => r.request_item_id}
      rowClassName={(r) => (isFinal(r) ? "row--finalized" : undefined)}
      emptyState="No tests on this request."
      columns={[
        {
          key: "test",
          header: "Test",
          cell: (r) => (
            <div className="cell-stack">
              <span className="cell-id">{r.test_code}</span>
              <span className="result-test-name">{r.test_name}</span>
            </div>
          ),
        },
        {
          key: "result",
          header: "Result",
          className: "result-input-cell",
          cell: (r) =>
            isNumeric(r) ? (
              <input
                className="field__input result-input"
                type="number"
                step="any"
                placeholder="0.00"
                value={editFor(r).numeric_value}
                disabled={isFinal(r)}
                onChange={(e) => onEdit(r.request_item_id, "numeric_value", e.target.value)}
              />
            ) : (
              <select
                className="field__input result-input"
                value={editFor(r).text_value}
                disabled={isFinal(r)}
                onChange={(e) => onEdit(r.request_item_id, "text_value", e.target.value)}
              >
                <option value="">—</option>
                {TEXT_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ),
        },
        { key: "unit", header: "Unit", cell: (r) => <span className="cell-muted">{r.unit ?? "—"}</span> },
        {
          key: "reference",
          header: "Reference Range",
          cell: (r) => (
            <div className="cell-stack">
              <span className="cell-muted">
                {r.ref_min != null && r.ref_max != null ? `${r.ref_min} – ${r.ref_max}` : "—"}
              </span>
              {r.ref_age_group && (
                <span className="ref-note capitalize">
                  {r.ref_age_group} · {r.ref_gender}
                </span>
              )}
            </div>
          ),
        },
        { key: "flag", header: "Flag", cell: (r) => <FlagCell flag={r.flag} /> },
        {
          key: "notes",
          header: "Notes",
          cell: (r) => (
            <input
              className="field__input result-input"
              placeholder="Optional..."
              value={editFor(r).notes}
              disabled={isFinal(r)}
              onChange={(e) => onEdit(r.request_item_id, "notes", e.target.value)}
            />
          ),
        },
        {
          key: "status",
          header: "Status",
          cell: (r) =>
            isFinal(r) ? <StatusBadge tone="success">Final</StatusBadge> : <StatusBadge>Draft</StatusBadge>,
        },
        {
          key: "actions",
          header: "Actions",
          cell: (r) => {
            if (isFinal(r)) return null;
            const mine = saving === r.request_item_id;
            return (
              <div className="row-actions">
                <button className="action-btn" disabled={!!saving} onClick={() => onSave(r, true)}>
                  {mine ? "..." : "Draft"}
                </button>
                <button className="save-btn" disabled={!!saving} onClick={() => onSave(r, false)}>
                  {mine ? "..." : "Finalize"}
                </button>
              </div>
            );
          },
        },
      ]}
    />
  );
}
