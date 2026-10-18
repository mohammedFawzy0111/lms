import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { api, errMsg } from "../../lib/api";
import { ProfileFormModal } from "./ProfileFormModal";
import type { Profile } from "./types";

interface Props {
  actorId: string;
  /** Lives in the page so the header's "+ New Profile" button can open it. */
  showForm: Profile | null | "new";
  setShowForm: (v: Profile | null | "new") => void;
}

export function ProfilesView({ actorId, showForm, setShowForm }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfiles(await api<Profile[]>("cmd_list_profiles"));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const toggleActive = (p: Profile) =>
    run(() => api("cmd_set_profile_active", { actorId, id: p.id, active: !p.is_active }));

  const remove = (p: Profile) => {
    if (!confirm(`Delete profile "${p.name}"? This won't delete the underlying tests.`)) return;
    return run(() => api("cmd_delete_profile", { actorId, id: p.id }));
  };

  return (
    <>
      {error && <div className="error">{error}</div>}

      <DataTable
        rows={profiles}
        getRowKey={(p) => p.id}
        columns={[
          { key: "name", header: "Name", cell: (p) => <strong>{p.name}</strong> },
          { key: "description", header: "Description", cell: (p) => <span className="cell-muted">{p.description ?? "—"}</span> },
          { key: "test_count", header: "Tests", cell: (p) => <span className="badge-count">{p.test_count} {p.test_count === 1 ? "test" : "tests"}</span> },
          {
            key: "is_active",
            header: "Status",
            cell: (p) => (
              <StatusBadge tone={p.is_active ? "success" : "danger"}>
                {p.is_active ? "Active" : "Disabled"}
              </StatusBadge>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            cell: (p) => (
              <div className="row-actions">
                <button className="action-btn" onClick={() => setShowForm(p)}>Edit</button>
                <button className="action-btn" onClick={() => toggleActive(p)}>
                  {p.is_active ? "Disable" : "Enable"}
                </button>
                <button className="action-btn action-btn--danger" onClick={() => remove(p)}>Delete</button>
              </div>
            ),
          },
        ]}
        loadingState={loading}
        emptyState="No profiles yet. Create one to bundle common tests together (e.g. CBC, LFT)."
        sticky={false}
      />

      {showForm && (
        <ProfileFormModal
          profile={showForm === "new" ? null : showForm}
          actorId={actorId}
          onClose={() => setShowForm(null)}
          onSaved={load}
        />
      )}
    </>
  );
}
