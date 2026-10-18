import { useEffect, useState } from "react";
import { CatTabs } from "../../components/ui/CatTabs";
import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { api, errMsg } from "../../lib/api";
import { money } from "../../lib/format";
import { useAuthStore } from "../../stores/authStore";
import type { Category, Investigation } from "./types";
import type { useInvestigationList } from "./useInvestigationList";

interface Props {
  categories: Category[];
  list: ReturnType<typeof useInvestigationList>;
  onEdit: (inv: Investigation) => void;
  onRanges: (inv: Investigation) => void;
}

export function IndividualTests({ categories, list, onEdit, onRanges }: Props) {
  const actorId = useAuthStore((s) => s.session?.user.id);
  const { items, loading, load, reload, setError } = list;
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Debounced fetch whenever the filter changes (also runs on first mount).
  useEffect(() => {
    const t = setTimeout(() => load(activeCat, query), 200);
    return () => clearTimeout(t);
  }, [activeCat, query, load]);

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const toggleActive = (inv: Investigation) =>
    run(() =>
      api("cmd_set_investigation_active", {
        actorId,
        id: inv.id,
        active: !inv.is_active,
      }),
    );

  const remove = (inv: Investigation) => {
    if (!confirm(`Delete "${inv.test_name}" (${inv.test_code})? This removes its reference ranges too.`))
      return;
    return run(() => api("cmd_delete_investigation", { actorId, id: inv.id }));
  };

  return (
    <>
      <div className="toolbar">
        <CatTabs
          categories={categories.map((c) => c.id)}
          categoriesLabels={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
          onSelect={(v) => setActiveCat(v || null)}
        />
        <input
          className="field__input search"
          placeholder="Search test name or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <DataTable
        rows={items}
        getRowKey={(r) => r.id}
        columns={[
          { key: "test_code", header: "Code", cell: (s) => <span className="font-mono">{s.test_code}</span> },
          { key: "test_name", header: "Test Name" },
          { key: "category_name", header: "Category", cell: (s) => <span className="cell-muted">{s.category_name ?? "—"}</span> },
          { key: "unit", header: "Unit", cell: (s) => <span className="cell-muted">{s.unit ?? "—"}</span> },
          { key: "cost", header: "Cost", cell: (s) => money(s.cost) },
          {
            key: "is_active",
            header: "Status",
            cell: (s) => (
              <StatusBadge tone={s.is_active ? "success" : "danger"}>
                {s.is_active ? "Active" : "Disabled"}
              </StatusBadge>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            cell: (s) => (
              <div className="row-actions">
                <button className="action-btn" onClick={() => onRanges(s)}>Ranges</button>
                <button className="action-btn" onClick={() => onEdit(s)}>Edit</button>
                <button className="action-btn" onClick={() => toggleActive(s)}>
                  {s.is_active ? "Disable" : "Enable"}
                </button>
                <button className="action-btn action-btn--danger" onClick={() => remove(s)}>Delete</button>
              </div>
            ),
          },
        ]}
        loadingState={loading}
        emptyState="No investigations found."
        sticky={false}
      />
    </>
  );
}
