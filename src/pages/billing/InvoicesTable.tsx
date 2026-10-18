import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { money } from "../../lib/format";
import { STATUS_LABELS, STATUS_TONES } from "./constants";
import type { Invoice } from "./types";

interface Props {
  rows: Invoice[];
  loading: boolean;
  onView: (id: string) => void;
}

export function InvoicesTable({ rows, loading, onView }: Props) {
  return (
    <DataTable
      rows={rows}
      loadingState={loading}
      getRowKey={(inv) => inv.id}
      emptyState="No invoices found."
      columns={[
        { key: "invoice_no", header: "Invoice #", cell: (inv) => <span className="font-mono">{inv.invoice_no}</span> },
        {
          key: "patient_name",
          header: "Patient",
          cell: (inv) => (
            <div className="cell-stack">
              <span>{inv.patient_name}</span>
              <span className="cell-id">{inv.patient_no}</span>
            </div>
          ),
        },
        { key: "total", header: "Total", cell: (inv) => <span className="nowrap">{money(inv.total)}</span> },
        { key: "amount_paid", header: "Paid", cell: (inv) => <span className="amount--paid nowrap">{money(inv.amount_paid)}</span> },
        {
          key: "balance",
          header: "Balance",
          cell: (inv) => (
            <span className={`nowrap ${inv.balance > 0 ? "amount--due" : "cell-muted"}`}>{money(inv.balance)}</span>
          ),
        },
        {
          key: "status",
          header: "Status",
          cell: (inv) => (
            <StatusBadge tone={STATUS_TONES[inv.status] ?? "default"}>
              {STATUS_LABELS[inv.status] ?? inv.status}
            </StatusBadge>
          ),
        },
        {
          key: "actions",
          header: "Actions",
          cell: (inv) => (
            <div className="row-actions">
              <button className="action-btn" onClick={() => onView(inv.id)}>View</button>
            </div>
          ),
        },
      ]}
    />
  );
}
