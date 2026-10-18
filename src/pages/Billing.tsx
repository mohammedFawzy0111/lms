import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CatTabs } from "../components/ui/CatTabs";
import { Page } from "../components/ui/Page";
import { useAuthStore } from "../stores/authStore";
import { InvoiceDetailModal } from "./billing/InvoiceDetailModal";
import { InvoicesTable } from "./billing/InvoicesTable";
import { STATUSES, STATUS_LABELS } from "./billing/constants";
import { useInvoiceDeepLink } from "./billing/useInvoiceDeepLink";
import { useInvoiceList } from "./billing/useInvoiceList";
import "./styles/Billing.css";

export default function Billing() {
  const [searchParams] = useSearchParams();
  const actorId = useAuthStore((s) => s.session?.user.id);
  const { invoices, loading, error, load, reload } = useInvoiceList();

  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Debounced fetch whenever the filter changes (also runs on first mount).
  useEffect(() => {
    const t = setTimeout(() => load(statusFilter, query), 200);
    return () => clearTimeout(t);
  }, [statusFilter, query, load]);

  useInvoiceDeepLink(
    searchParams.get("request"),
    actorId,
    useCallback((id: string) => setDetailId(id), []),
    reload,
    setLinkError,
  );

  return (
    <Page title="Billing" subtitle={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}>
      <div className="toolbar">
        <CatTabs categories={STATUSES} categoriesLabels={STATUS_LABELS} onSelect={setStatusFilter} />
        <input
          className="field__input search"
          placeholder="Search patient, invoice #..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {(error || linkError) && <div className="error">{error ?? linkError}</div>}

      <InvoicesTable rows={invoices} loading={loading} onView={setDetailId} />

      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          actorId={actorId ?? ""}
          onClose={() => setDetailId(null)}
          onChanged={reload}
        />
      )}
    </Page>
  );
}
