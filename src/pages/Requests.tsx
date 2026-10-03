import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useAuthStore } from "../stores/authStore";
import "./styles/Dashboard.css";
import "./styles/Patients.css";
import "./styles/Requests.css";
import { Page } from "../components/ui/Page";
import { CatTabs } from "../components/ui/CatTabs";

interface LabRequest {
  id: string;
  request_no: string;
  patient_id: string;
  patient_name: string;
  patient_no: string;
  status: string;
  priority: string;
  request_date: string;
  collection_date: string | null;
  due_date: string | null;
  notes: string | null;
  item_count: number;
  created_at: string;
}

interface RequestItem {
  id: string;
  request_id: string;
  investigation_id: string;
  test_code: string;
  test_name: string;
  status: string;
  price_at_order: number;
}

interface Patient {
  id: string;
  patient_no: string;
  full_name: string;
}

interface Investigation {
  id: string;
  test_code: string;
  test_name: string;
  cost: number;
}

interface RequestDetail {
  id: string;
  request_no: string;
  patient: Patient;
  status: string;
  priority: string;
  request_date: string;
  collection_date: string | null;
  due_date: string | null;
  notes: string | null;
  items: RequestItem[];
}

interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  test_count: number;
}

interface ReportLogEntry {
  id: string;
  generated_by: string | null;
  generated_by_name: string | null;
  generated_at: string;
}

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const STATUSES = [
  "pending",
  "sample_collected",
  "in_progress",
  "completed",
  "delivered",
  "cancelled",
];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sample_collected: "Sample Collected",
  in_progress: "In Progress",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "default",
  sample_collected: "info",
  in_progress: "warning",
  completed: "success",
  delivered: "success",
  cancelled: "inactive",
};

export default function Requests() {
  const currentUser = useAuthStore((s) => s.session?.user);
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openPrint(requestId: string) {
    const label = `print_${requestId.slice(0, 8)}`;
    const win = new WebviewWindow(label, {
      url: `/#/print/${requestId}`,
      title: "Print Report",
      width: 900,
      height: 720,
      center: true,
      decorations: true,
      resizable: true,
    });
    win.once("tauri://error", (e) => console.error("Print window error:", e));
  }

  function printSelected() {
    let index = 0;
    selectedIds.forEach((id) => {
      setTimeout(() => openPrint(id), index * 300);
      index += 1;
    });
  }

  const load = useCallback(async (status: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<LabRequest[]>>("cmd_list_requests", {
        status: status || null,
        search: q.trim() || null,
        limit: 100,
      });
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load");
      setRequests(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(statusFilter, query), 200);
    return () => clearTimeout(t);
  }, [statusFilter, query, load]);

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
      <div className="inv-toolbar">
        <CatTabs
          categories={STATUSES}
          categoriesLabels={STATUS_LABELS}
          onSelect={setStatusFilter}
        />
        <input
          className="field__input inv-search"
          placeholder="Search patient, request #..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="users-error">{error}</div>}

      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loading">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="users-loading">No requests found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === requests.length
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? new Set(requests.map((r) => r.id))
                          : new Set(),
                      )
                    }
                  />
                </th>
                <th>Request #</th>
                <th>Patient</th>
                <th>Tests</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: 12 }}>
                      {r.request_no}
                    </span>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {r.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{r.patient_name}</span>
                        <span
                          className="font-mono"
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {r.patient_no}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-count">
                      {r.item_count} test{r.item_count !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td>
                    {r.priority === "urgent" ? (
                      <span className="status-badge status-badge--inactive">
                        Urgent
                      </span>
                    ) : (
                      <span
                        style={{ fontSize: 12, color: "var(--text-muted)" }}
                      >
                        Normal
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge status-badge--${STATUS_COLORS[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {r.request_date.split(" ")[0]}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="action-btn"
                        onClick={() => setDetailId(r.id)}
                      >
                        View
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => navigate(`/results/${r.id}`)}
                      >
                        Results
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => openPrint(r.id)}
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewRequestModal
          actorId={currentUser?.id ?? ""}
          onClose={() => setShowNew(false)}
          onSaved={() => load(statusFilter, query)}
        />
      )}

      {detailId && (
        <RequestDetailModal
          requestId={detailId}
          actorId={currentUser?.id ?? ""}
          onClose={() => setDetailId(null)}
          onChanged={() => load(statusFilter, query)}
          onPrint={openPrint}
        />
      )}
    </Page>
  );
}

// ── New Request Modal (handles BOTH existing + new patient flows) ────────────

function NewRequestModal({
  actorId,
  onClose,
  onSaved,
}: {
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [testTab, setTestTab] = useState<"profiles" | "individual">("profiles");
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // New patient fields
  const [newPatient, setNewPatient] = useState({
    full_name: "",
    date_of_birth: "",
    age_override: null as number | null,
    gender: "",
    phone: "",
    address: "",
    email: "",
    referring_physician: "",
    notes: "",
  });

  // Shared: test selection
  const [allTests, setAllTests] = useState<Investigation[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<Set<string>>(
    new Set(),
  );
  const [priority, setPriority] = useState("normal");
  const [collectionDate, setCollectionDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<ApiResult<Investigation[]>>("cmd_list_investigations", {
      categoryId: null,
      search: null,
      includeInactive: false,
    }).then((res) => {
      if (res.ok && res.data) setAllTests(res.data);
    });

    invoke<ApiResult<Profile[]>>("cmd_list_profiles").then((res) => {
      if (res.ok && res.data) setProfiles(res.data.filter((p) => p.is_active));
    });
  }, []);

  useEffect(() => {
    if (!patientQuery.trim()) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await invoke<ApiResult<Patient[]>>("cmd_search_patients", {
        query: patientQuery,
        limit: 10,
      });
      if (res.ok && res.data) setPatientResults(res.data);
    }, 200);
    return () => clearTimeout(t);
  }, [patientQuery]);

  function toggleTest(id: string) {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleProfile(id: string) {
    setSelectedProfile((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalCost = allTests
    .filter((t) => selectedTests.has(t.id))
    .reduce((sum, t) => sum + t.cost, 0);

  async function submit() {
    setError(null);
    if (selectedTests.size === 0) {
      setError("Select at least one test");
      return;
    }

    setLoading(true);
    try {
      if (mode === "existing") {
        if (!selectedPatient) {
          setError("Select a patient");
          setLoading(false);
          return;
        }
        const res = await invoke<ApiResult<RequestDetail>>(
          "cmd_create_request",
          {
            actorId,
            request: {
              patient_id: selectedPatient.id,
              investigation_ids: Array.from(selectedTests),
              priority,
              collection_date: collectionDate || null,
              due_date: dueDate || null,
              notes: notes || null,
            },
          },
        );
        if (!res.ok) throw new Error(res.error ?? "Failed to create request");
      } else {
        if (!newPatient.full_name.trim()) {
          setError("Patient name is required");
          setLoading(false);
          return;
        }
        const res = await invoke<ApiResult<RequestDetail>>(
          "cmd_create_patient_with_request",
          {
            actorId,
            payload: {
              patient: {
                full_name: newPatient.full_name,
                date_of_birth: newPatient.date_of_birth || null,
                age_override: newPatient.age_override,
                gender: newPatient.gender || null,
                phone: newPatient.phone || null,
                address: newPatient.address || null,
                email: newPatient.email || null,
                referring_physician: newPatient.referring_physician || null,
                notes: newPatient.notes || null,
              },
              investigation_ids: Array.from(selectedTests),
              priority,
              collection_date: collectionDate || null,
              due_date: dueDate || null,
              notes: notes || null,
            },
          },
        );
        if (!res.ok)
          throw new Error(res.error ?? "Failed to create patient & request");
      }
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
        <div className="modal__header">New Lab Request</div>

        <div className="view-tabs" style={{ padding: "0 var(--sp-6)" }}>
          <button
            className={`view-tab ${mode === "existing" ? "view-tab--active" : ""}`}
            onClick={() => setMode("existing")}
          >
            Existing Patient
          </button>
          <button
            className={`view-tab ${mode === "new" ? "view-tab--active" : ""}`}
            onClick={() => setMode("new")}
          >
            Register New Patient
          </button>
        </div>

        <div className="modal__body">
          {error && (
            <div className="users-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          {mode === "existing" ? (
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Search Patient</label>
              {selectedPatient ? (
                <div className="selected-patient">
                  <span>
                    {selectedPatient.full_name}{" "}
                    <span
                      className="font-mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ({selectedPatient.patient_no})
                    </span>
                  </span>
                  <button
                    className="action-btn"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    className="field__input"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Type name, ID, or phone..."
                  />
                  {patientResults.length > 0 && (
                    <div className="patient-results">
                      {patientResults.map((p) => (
                        <div
                          key={p.id}
                          className="patient-results__item"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientQuery("");
                            setPatientResults([]);
                          }}
                        >
                          {p.full_name}{" "}
                          <span
                            className="font-mono"
                            style={{ fontSize: 11, color: "var(--text-muted)" }}
                          >
                            ({p.patient_no})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div
              className="modal-grid modal-grid--3"
              style={{ marginBottom: 16 }}
            >
              <div className="field field--span2">
                <label className="field__label">Full Name *</label>
                <input
                  className="field__input"
                  value={newPatient.full_name}
                  onChange={(e) =>
                    setNewPatient((p) => ({ ...p, full_name: e.target.value }))
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="field">
                <label className="field__label">Gender</label>
                <select
                  className="field__input"
                  value={newPatient.gender}
                  onChange={(e) =>
                    setNewPatient((p) => ({ ...p, gender: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label">Date of Birth</label>
                <input
                  className="field__input"
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) =>
                    setNewPatient((p) => ({
                      ...p,
                      date_of_birth: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="field">
                <label className="field__label">
                  Age {newPatient.date_of_birth ? "(auto)" : "(if DOB unknown)"}
                </label>
                <input
                  className="field__input"
                  type="number"
                  disabled={!!newPatient.date_of_birth}
                  value={newPatient.age_override ?? ""}
                  onChange={(e) =>
                    setNewPatient((p) => ({
                      ...p,
                      age_override:
                        e.target.value === ""
                          ? null
                          : parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
              <div className="field">
                <label className="field__label">Phone</label>
                <input
                  className="field__input"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <div className="modal-grid" style={{ marginBottom: 16 }}>
            <div className="field">
              <label className="field__label">Priority</label>
              <select
                className="field__input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label">Collection Date</label>
              <input
                className="field__input"
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label">Due Date</label>
              <input
                className="field__input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label">Notes</label>
              <input
                className="field__input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <label className="field__label" style={{ display: "block" }}>
              Select Tests ({selectedTests.size} selected — $
              {totalCost.toFixed(2)})
            </label>
            <div className="view-tabs" style={{ borderBottom: "none" }}>
              <button
                className={`view-tab ${testTab === "profiles" ? "view-tab--active" : ""}`}
                onClick={() => setTestTab("profiles")}
              >
                Profiles & Panels
              </button>
              <button
                className={`view-tab ${testTab === "individual" ? "view-tab--active" : ""}`}
                onClick={() => setTestTab("individual")}
              >
                Individual Tests
              </button>
            </div>
          </div>

          {testTab === "profiles" ? (
            <div className="test-picker">
              {profiles.length === 0 ? (
                <p
                  style={{
                    padding: "var(--sp-3)",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  No profiles available yet. Switch to Individual Tests, or
                  create one in Investigations.
                </p>
              ) : (
                profiles.map((p) => (
                  <label key={p.id} className="test-picker__item">
                    <input
                      type="checkbox"
                      checked={selectedProfile.has(p.id)}
                      onChange={() => toggleProfile(p.id)}
                    />
                    <span style={{ flex: 1 }}>
                      <strong>{p.name}</strong>
                      {p.description && (
                        <span
                          style={{ color: "var(--text-muted)", marginLeft: 8 }}
                        >
                          {p.description}
                        </span>
                      )}
                    </span>
                    <span className="badge-count">{p.test_count} tests</span>
                  </label>
                ))
              )}
            </div>
          ) : (
            <div className="test-picker">
              {allTests.map((t) => (
                <label key={t.id} className="test-picker__item">
                  <input
                    type="checkbox"
                    checked={selectedTests.has(t.id)}
                    onChange={() => toggleTest(t.id)}
                  />
                  <span
                    className="font-mono"
                    style={{ fontSize: 11, color: "var(--text-muted)" }}
                  >
                    {t.test_code}
                  </span>
                  <span style={{ flex: 1 }}>{t.test_name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    ${t.cost.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="modal__footer">
            <button className="action-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="save-btn" onClick={submit} disabled={loading}>
              {loading ? "Creating..." : "Create Request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Request Detail Modal ──────────────────────────────────────────────────────
function RequestDetailModal({
  requestId,
  actorId,
  onClose,
  onChanged,
  onPrint,
}: {
  requestId: string;
  actorId: string;
  onClose: () => void;
  onChanged: () => void;
  onPrint: (id: string) => void;
}) {
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printHistory, setPrintHistry] = useState<ReportLogEntry[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<ApiResult<RequestDetail>>("cmd_get_request", {
        id: requestId,
      });
      if (res.ok && res.data) setDetail(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrintHistory() {
    const res = await invoke<ApiResult<ReportLogEntry[]>>(
      "cmd_list_report_log",
      { requestId },
    );
    if (res.ok && res.data) setPrintHistry(res.data);
  }

  useEffect(() => {
    load();
    loadPrintHistory();
  }, [requestId]);

  async function changeStatus(status: string) {
    try {
      await invoke("cmd_update_request_status", {
        actorId,
        id: requestId,
        status,
      });
      load();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function changeItemStatus(itemId: string, status: string) {
    try {
      await invoke("cmd_update_item_status", { actorId, itemId, status });
      load();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading || !detail) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal__body">
            <div className="users-loading">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          {detail.request_no} — {detail.patient.full_name}
        </div>
        <div className="modal__body">
          {error && (
            <div className="users-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div className="detail-grid" style={{ marginBottom: 20 }}>
            <DetailField label="Patient ID" value={detail.patient.patient_no} />
            <DetailField label="Priority" value={detail.priority} />
            <DetailField
              label="Request Date"
              value={detail.request_date.split(" ")[0]}
            />
            <DetailField
              label="Collection Date"
              value={detail.collection_date?.split(" ")[0] ?? "—"}
            />
            <DetailField
              label="Due Date"
              value={detail.due_date?.split(" ")[0] ?? "—"}
            />
            <DetailField label="Notes" value={detail.notes ?? "—"} />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="field__label">Overall Request Status</label>
            <select
              className="field__input"
              value={detail.status}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <label
            className="field__label"
            style={{ marginBottom: 8, display: "block" }}
          >
            Test Items
          </label>
          <table className="ranges-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Test</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono" style={{ fontSize: 12 }}>
                    {item.test_code}
                  </td>
                  <td>{item.test_name}</td>
                  <td>${item.price_at_order.toFixed(2)}</td>
                  <td>
                    <select
                      className="field__input"
                      value={item.status}
                      onChange={(e) =>
                        changeItemStatus(item.id, e.target.value)
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {printHistory.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <label
                className="field__label"
                style={{ marginBottom: 8, display: "block" }}
              >
                Print History ({printHistory.length})
              </label>
              <table className="ranges-table">
                <thead>
                  <tr>
                    <th>Printed By</th>
                    <th>Date & Time</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {printHistory.map((p) => (
                    <tr key={p.id}>
                      <td>{p.generated_by_name ?? "Unknown"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {p.generated_at}
                      </td>
                      <td>
                        <button
                          className="action-btn"
                          onClick={() => onPrint(detail.id)}
                        >
                          Reprint
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="action-btn"
            onClick={() =>
              (window.location.hash = `#/billing?request=${detail.id}`)
            }
          >
            💳 Billing
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          textTransform: "capitalize",
        }}
      >
        {value}
      </span>
    </div>
  );
}
