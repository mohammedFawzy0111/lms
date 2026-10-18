import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CatTabs } from "../components/ui/CatTabs";
import { Page } from "../components/ui/Page";
import { openReportWindow } from "../lib/printWindow";
import { useAuthStore } from "../stores/authStore";
import { NewRequestModal } from "./requests/NewRequestModal";
import { RequestDetailModal } from "./requests/RequestDetailModal";
import { RequestsTable } from "./requests/RequestsTable";
import { STATUSES, STATUS_LABELS } from "./requests/constants";
import { useRequestList } from "./requests/useRequestList";
import "./styles/Requests.css";

export default function Requests() {
  const navigate = useNavigate();
  const actorId = useAuthStore((s) => s.session?.user.id ?? "");
  const { requests, loading, error, load, reload } = useRequestList();

  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounced fetch whenever the filter changes (also runs on first mount).
  useEffect(() => {
    const t = setTimeout(() => load(statusFilter, query), 200);
    return () => clearTimeout(t);
  }, [statusFilter, query, load]);

  // Drop selections that are no longer in the list (after a filter or search change),
  // so "Print Selected" can't print requests the user can't see.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(requests.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [requests]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Stagger the windows so they don't all open on the same tick.
  function printSelected() {
    [...selectedIds].forEach((id, i) => setTimeout(() => openReportWindow(id), i * 300));
  }

  return (
    <Page
      title="Lab Requests"
      subtitle={`${requests.length} request${requests.length !== 1 ? "s" : ""}`}
      actionBtn={
        <>
          {selectedIds.size > 0 && (
            <button className="action-btn" onClick={printSelected}>
              Print Selected({selectedIds.size})
            </button>
          )}
          <button className="save-btn" onClick={() => setShowNew(true)}>
            + New Request
          </button>
        </>
      }
    >
      <div className="toolbar">
        <CatTabs categories={STATUSES} categoriesLabels={STATUS_LABELS} onSelect={setStatusFilter} />
        <input
          className="field__input search"
          placeholder="Search patient, request #..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <RequestsTable
        rows={requests}
        loading={loading}
        selectedIds={selectedIds}
        onToggle={toggleSelect}
        onToggleAll={(checked) => setSelectedIds(new Set(checked ? requests.map((r) => r.id) : []))}
        onView={setDetailId}
        onResults={(id) => navigate(`/results/${id}`)}
        onPrint={openReportWindow}
      />

      {showNew && (
        <NewRequestModal actorId={actorId} onClose={() => setShowNew(false)} onSaved={reload} />
      )}

      {detailId && (
        <RequestDetailModal
          requestId={detailId}
          actorId={actorId}
          onClose={() => setDetailId(null)}
          onChanged={reload}
          onPrint={openReportWindow}
        />
      )}
    </Page>
  );
}
