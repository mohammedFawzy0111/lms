import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../stores/authStore";
import "./Investigations.css";
import "./Dashboard.css";

interface Category {
  id: string;
  name: string;
}

interface Investigation {
  id: string;
  test_code: string;
  test_name: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  unit: string | null;
  cost: number;
  result_type: string;
  is_active: boolean;
  critical_low: number | null;
  critical_high: number | null;
  created_at: string;
  updated_at: string;
}

interface NewInvestigation {
  test_code: string;
  test_name: string;
  category_id: string | null;
  description: string | null;
  unit: string | null;
  cost: number;
  result_type: string;
  critical_low: number | null;
  critical_high: number | null;
}

interface ReferenceRange {
  id: string;
  investigation_id: string;
  age_group: string;
  gender: string;
  min_value: number | null;
  max_value: number | null;
}

interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  test_count: number;
}

interface ProfileWithTests {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  investigation_ids: string[];
}

interface NewProfile {
  name: string;
  description: string | null;
  investigation_ids: string[];
}

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const AGE_GROUPS = ["neonate", "infant", "child", "adolescent", "adult", "elderly"];
const GENDERS = ["any", "male", "female"];

export default function Investigations() {
  const currentUser = useAuthStore((s) => s.session?.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<Investigation | null | "new">(null);
  const [rangesFor, setRangesFor] = useState<Investigation | null>(null);
  const [view, setView] = useState<"tests" | "profiles">("profiles");
  const [showProfileForm, setShowProfileForm] = useState<Profile | null | "new">(null);

  const loadCategories = useCallback(async () => {
    const res = await invoke<ApiResult<Category[]>>("cmd_list_categories");
    if (res.ok && res.data) setCategories(res.data);
  }, []);

  const loadItems = useCallback(async (cat: string | null, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<Investigation[]>>("cmd_list_investigations", {
        categoryId: cat,
        search: q.trim() || null,
        includeInactive: true,
      });
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load");
      setItems(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => {
    const t = setTimeout(() => loadItems(activeCat, query), 200);
    return () => clearTimeout(t);
  }, [activeCat, query, loadItems]);

  async function toggleActive(inv: Investigation) {
    if (!currentUser) return;
    try {
      await invoke("cmd_set_investigation_active", {
        actorId: currentUser.id, id: inv.id, active: !inv.is_active,
      });
      loadItems(activeCat, query);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(inv: Investigation) {
    if (!currentUser) return;
    if (!confirm(`Delete "${inv.test_name}" (${inv.test_code})? This removes its reference ranges too.`)) return;
    try {
      await invoke("cmd_delete_investigation", { actorId: currentUser.id, id: inv.id });
      loadItems(activeCat, query);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Investigations</h1>
          <p className="page-sub">
            {view === "tests" ? `${items.length} test${items.length !== 1 ? "s"
              : ""} in catalogue` : "Mangae test profiles & panels"}
          </p>
        </div>
        <button className="save-btn" onClick={() => view === "tests" ? setShowForm("new") : setShowProfileForm("new")}>
          {view === "tests" ? "+ New Test" : "+ New Profile"}
        </button>
      </header>

      <div className="view-tabs">
        <button className={`view-tab ${view === "tests" ? "view-tab--active" : ""}`} onClick={() => setView("tests")}>
          Individual Tests
        </button>
        <button className={`view-tab ${view === "profiles" ? "view-tab--active" : ""}`} onClick={() => setView("profiles")}>
          Profiles & Panels
        </button>
      </div>

      {view === "tests" ? (
        <>
          <div className="inv-toolbar">
            <div className="cat-tabs">
              <button
                className={`cat-tab ${activeCat === null ? "cat-tab--active" : ""}`}
                onClick={() => setActiveCat(null)}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`cat-tab ${activeCat === c.id ? "cat-tab--active" : ""}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <input
              className="field__input inv-search"
              placeholder="Search test name or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && <div className="users-error">{error}</div>}

          <div className="users-table-wrap">
            {loading ? (
              <div className="users-loading">Loading...</div>
            ) : items.length === 0 ? (
              <div className="users-loading">No investigations found.</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((inv) => (
                    <tr key={inv.id}>
                      <td><span className="font-mono" style={{ fontSize: 12 }}>{inv.test_code}</span></td>
                      <td>{inv.test_name}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{inv.category_name ?? "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{inv.unit ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>${inv.cost.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-badge--${inv.is_active ? "active" : "inactive"}`}>
                          {inv.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="action-btn" onClick={() => setRangesFor(inv)}>Ranges</button>
                          <button className="action-btn" onClick={() => setShowForm(inv)}>Edit</button>
                          <button className="action-btn" onClick={() => toggleActive(inv)}>
                            {inv.is_active ? "Disable" : "Enable"}
                          </button>
                          <button className="action-btn" onClick={() => handleDelete(inv)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>) : (
        <ProfilesView
          actorId={currentUser?.id ?? ""}
          showProfileForm={showProfileForm}
          setShowProfileForm={setShowProfileForm}
        />
      )}
      {showForm && (
        <InvestigationFormModal
          investigation={showForm === "new" ? null : showForm}
          categories={categories}
          actorId={currentUser?.id ?? ""}
          onClose={() => setShowForm(null)}
          onSaved={() => { loadItems(activeCat, query); loadCategories(); }}
        />
      )}

      {rangesFor && (
        <ReferenceRangesModal
          investigation={rangesFor}
          onClose={() => setRangesFor(null)}
        />
      )}
    </div>
  );
}

// ── Create/Edit Investigation Modal ───────────────────────────────────────────

function InvestigationFormModal({ investigation, categories, actorId, onClose, onSaved }: {
  investigation: Investigation | null;
  categories: Category[];
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!investigation;
  const [form, setForm] = useState<NewInvestigation>({
    test_code: investigation?.test_code ?? "",
    test_name: investigation?.test_name ?? "",
    category_id: investigation?.category_id ?? null,
    description: investigation?.description ?? "",
    unit: investigation?.unit ?? "",
    cost: investigation?.cost ?? 0,
    result_type: investigation?.result_type ?? "numeric",
    critical_low: investigation?.critical_low ?? null,
    critical_high: investigation?.critical_high ?? null,
  });
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof NewInvestigation>(k: K, v: NewInvestigation[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      const res = await invoke<ApiResult<Category>>("cmd_create_category", { name: newCatName.trim() });
      if (res.ok && res.data) {
        set("category_id", res.data.id);
        setNewCatName("");
        onSaved(); // refresh category list in parent
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const cmd = isEdit ? "cmd_update_investigation" : "cmd_create_investigation";
      const args = isEdit
        ? { actorId, id: investigation!.id, inv: form }
        : { actorId, inv: form };
      const res = await invoke<ApiResult<Investigation>>(cmd, args);
      if (!res.ok) throw new Error(res.error ?? "Failed to save");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">{isEdit ? `Edit Test — ${investigation!.test_code}` : "New Investigation"}</div>
        <div className="modal__body">
          {error && <div className="users-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="modal-grid modal-grid--3">
            <div className="field">
              <label className="field__label">Test Code *</label>
              <input className="field__input" value={form.test_code}
                onChange={(e) => set("test_code", e.target.value.toUpperCase())} placeholder="HGB" />
            </div>
            <div className="field field--span2">
              <label className="field__label">Test Name *</label>
              <input className="field__input" value={form.test_name}
                onChange={(e) => set("test_name", e.target.value)} placeholder="Hemoglobin" />
            </div>

            <div className="field">
              <label className="field__label">Category</label>
              <select className="field__input" value={form.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field field--span2" style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <input className="field__input" value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)} placeholder="Add new category..." />
              <button type="button" className="action-btn" onClick={addCategory}>Add</button>
            </div>

            <div className="field">
              <label className="field__label">Unit</label>
              <input className="field__input" value={form.unit ?? ""}
                onChange={(e) => set("unit", e.target.value)} placeholder="g/dL" />
            </div>
            <div className="field">
              <label className="field__label">Cost</label>
              <input className="field__input" type="number" step="0.01" value={form.cost}
                onChange={(e) => set("cost", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="field">
              <label className="field__label">Result Type</label>
              <select className="field__input" value={form.result_type}
                onChange={(e) => set("result_type", e.target.value)}>
                <option value="numeric">Numeric</option>
                <option value="text">Text</option>
                <option value="multi_field">Multi-field</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label">Critical Low</label>
              <input className="field__input" type="number" step="0.01" value={form.critical_low ?? ""}
                onChange={(e) => set("critical_low", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label className="field__label">Critical High</label>
              <input className="field__input" type="number" step="0.01" value={form.critical_high ?? ""}
                onChange={(e) => set("critical_high", e.target.value === "" ? null : parseFloat(e.target.value))} />
            </div>

            <div className="field field--span3">
              <label className="field__label">Description</label>
              <textarea className="field__input field__textarea" value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)} placeholder="Optional notes about this test..." />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={submit}
            disabled={loading || !form.test_code.trim() || !form.test_name.trim()}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reference Ranges Modal ────────────────────────────────────────────────────

function ReferenceRangesModal({ investigation, onClose }: {
  investigation: Investigation;
  onClose: () => void;
}) {
  const [ranges, setRanges] = useState<ReferenceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRange, setNewRange] = useState({ age_group: "adult", gender: "any", min_value: "", max_value: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<ApiResult<ReferenceRange[]>>("cmd_list_reference_ranges", {
        investigationId: investigation.id,
      });
      if (res.ok && res.data) setRanges(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addRange() {
    try {
      await invoke("cmd_add_reference_range", {
        investigationId: investigation.id,
        range: {
          age_group: newRange.age_group,
          gender: newRange.gender,
          min_value: newRange.min_value === "" ? null : parseFloat(newRange.min_value),
          max_value: newRange.max_value === "" ? null : parseFloat(newRange.max_value),
        },
      });
      setNewRange({ age_group: "adult", gender: "any", min_value: "", max_value: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function removeRange(id: string) {
    try {
      await invoke("cmd_delete_reference_range", { id });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          Reference Ranges — {investigation.test_name} ({investigation.unit ?? "no unit"})
        </div>
        <div className="modal__body">
          {error && <div className="users-error" style={{ marginBottom: 12 }}>{error}</div>}

          {loading ? (
            <div className="users-loading">Loading...</div>
          ) : (
            <table className="ranges-table">
              <thead>
                <tr><th>Age Group</th><th>Gender</th><th>Min</th><th>Max</th><th></th></tr>
              </thead>
              <tbody>
                {ranges.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textTransform: "capitalize" }}>{r.age_group}</td>
                    <td style={{ textTransform: "capitalize" }}>{r.gender}</td>
                    <td>{r.min_value ?? "—"}</td>
                    <td>{r.max_value ?? "—"}</td>
                    <td>
                      <button className="action-btn" onClick={() => removeRange(r.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <select className="field__input" value={newRange.age_group}
                      onChange={(e) => setNewRange((p) => ({ ...p, age_group: e.target.value }))}>
                      {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="field__input" value={newRange.gender}
                      onChange={(e) => setNewRange((p) => ({ ...p, gender: e.target.value }))}>
                      {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="field__input" type="number" step="0.01" value={newRange.min_value}
                      onChange={(e) => setNewRange((p) => ({ ...p, min_value: e.target.value }))} />
                  </td>
                  <td>
                    <input className="field__input" type="number" step="0.01" value={newRange.max_value}
                      onChange={(e) => setNewRange((p) => ({ ...p, max_value: e.target.value }))} />
                  </td>
                  <td>
                    <button className="save-btn" onClick={addRange}>Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


function ProfilesView({ actorId, showProfileForm, setShowProfileForm }: {
  actorId: string;
  showProfileForm: Profile | null | "new";
  setShowProfileForm: (v: Profile | null | "new") => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<ApiResult<Profile[]>>("cmd_list_profiles");
      if (res.ok && res.data) setProfiles(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Profile) {
    try {
      await invoke("cmd_set_profile_active", { actorId, id: p.id, active: !p.is_active });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(p: Profile) {
    if (!confirm(`Delete profile "${p.name}"? This won't delete the underlying tests.`)) return;
    try {
      await invoke("cmd_delete_profile", { actorId, id: p.id });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      {error && <div className="users-error">{error}</div>}
      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loading">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="users-loading">No profiles yet. Create one to bundle common tests together (e.g. CBC, LFT).</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr><th>Name</th><th>Description</th><th>Tests</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.description ?? "—"}</td>
                  <td><span className="badge-count">{p.test_count} tests</span></td>
                  <td>
                    <span className={`status-badge status-badge--${p.is_active ? "active" : "inactive"}`}>
                      {p.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn" onClick={() => setShowProfileForm(p)}>Edit</button>
                      <button className="action-btn" onClick={() => toggleActive(p)}>
                        {p.is_active ? "Disable" : "Enable"}
                      </button>
                      <button className="action-btn" onClick={() => handleDelete(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showProfileForm && (
        <ProfileFormModal
          profile={showProfileForm === "new" ? null : showProfileForm}
          actorId={actorId}
          onClose={() => setShowProfileForm(null)}
          onSaved={load}
        />
      )}
    </>
  );
}

function ProfileFormModal({ profile, actorId, onClose, onSaved }: {
  profile: Profile | null;
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!profile;
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [allTests, setAllTests] = useState<Investigation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<ApiResult<Investigation[]>>("cmd_list_investigations", {
      categoryId: null, search: null, includeInactive: false,
    }).then((res) => {
      if (res.ok && res.data) setAllTests(res.data);
    });

    if (profile) {
      invoke<ApiResult<ProfileWithTests>>("cmd_get_profile", { id: profile.id }).then((res) => {
        if (res.ok && res.data) setSelected(new Set(res.data.investigation_ids));
      });
    }
  }, []);

  function toggleTest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const payload: NewProfile = {
        name,
        description: description || null,
        investigation_ids: Array.from(selected),
      };
      const cmd = isEdit ? "cmd_update_profile" : "cmd_create_profile";
      const args = isEdit ? { actorId, id: profile!.id, profile: payload } : { actorId, profile: payload };
      const res = await invoke<ApiResult<ProfileWithTests>>(cmd, args);
      if (!res.ok) throw new Error(res.error ?? "Failed to save");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">{isEdit ? `Edit Profile — ${profile!.name}` : "New Profile / Panel"}</div>
        <div className="modal__body">
          {error && <div className="users-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="modal-grid" style={{ marginBottom: 16 }}>
            <div className="field field--span2">
              <label className="field__label">Profile Name *</label>
              <input className="field__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="CBC" />
            </div>
            <div className="field field--span2">
              <label className="field__label">Description</label>
              <input className="field__input" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="Complete Blood Count" />
            </div>
          </div>

          <label className="field__label" style={{ marginBottom: 8, display: "block" }}>
            Select Tests ({selected.size} selected)
          </label>
          <div className="test-picker">
            {allTests.map((t) => (
              <label key={t.id} className="test-picker__item">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleTest(t.id)}
                />
                <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.test_code}</span>
                <span>{t.test_name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={submit} disabled={loading || !name.trim() || selected.size === 0}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}


