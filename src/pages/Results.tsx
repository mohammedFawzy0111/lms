import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../stores/authStore";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./styles/Results.css";
import { Page } from "../components/ui/Page";
import { DataTable, type Column } from "../components/ui/CustomTable";

interface Result_ {
  id: string;
  request_item_id: string;
  test_code: string;
  test_name: string;
  unit: string | null;
  numeric_value: number | null;
  text_value: string | null;
  flag: string | null;
  is_draft: boolean;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
  updated_at: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_age_group: string | null;
  ref_gender: string | null;
}

interface RequestResultsView {
  request_id: string;
  request_no: string;
  patient_id: string;
  patient_name: string;
  patient_no: string;
  patient_dob: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  results: Result_[];
}

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const FLAG_LABEL: Record<string, string> = {
  low: "L",
  high: "H",
  critical_low: "CL",
  critical_high: "CH",
};
const FLAG_COLOR: Record<string, string> = {
  low: "var(--info)",
  high: "var(--warning)",
  critical_low: "var(--danger)",
  critical_high: "var(--danger)",
};

const TEXT_OPTIONS = [
  "Positive",
  "Negative",
  "Reactive",
  "Non-Reactive",
  "Present",
  "Absent",
];

export default function Results() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.session?.user);

  const [data, setData] = useState<RequestResultsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  // Local edits keyed by request_item_id
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        numeric_value: string;
        text_value: string;
        notes: string;
      }
    >
  >({});

  async function load() {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<RequestResultsView>>(
        "cmd_get_request_results",
        {
          requestId,
        },
      );
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load");
      setData(res.data);

      // Initialize edits from existing saved values
      const initial: typeof edits = {};
      for (const r of res.data.results) {
        initial[r.request_item_id] = {
          numeric_value: r.numeric_value != null ? String(r.numeric_value) : "",
          text_value: r.text_value ?? "",
          notes: r.notes ?? "",
        };
      }
      setEdits(initial);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [requestId]);

  function setEdit(itemId: string, key: string, value: string) {
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [key]: value },
    }));
    setSaved((prev) => {
      const n = new Set(prev);
      n.delete(itemId);
      return n;
    });
  }

  async function saveOne(result: Result_, isDraft: boolean) {
    if (!currentUser || !requestId) return;
    setSaving(result.request_item_id);
    const edit = edits[result.request_item_id];
    try {
      const res = await invoke<ApiResult<boolean>>("cmd_save_result", {
        actorId: currentUser.id,
        entry: {
          request_item_id: result.request_item_id,
          numeric_value: edit?.numeric_value
            ? parseFloat(edit.numeric_value)
            : null,
          text_value: edit?.text_value || null,
          notes: edit?.notes || null,
          is_draft: isDraft,
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Failed to save");
      if (!isDraft) {
        setSaved((prev) => new Set(prev).add(result.request_item_id));
      }
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  async function finalizeAll() {
    if (!currentUser || !requestId) return;
    setSaving("all");
    try {
      // Save all drafts first
      for (const result of data?.results ?? []) {
        const edit = edits[result.request_item_id];
        if (!edit) continue;
        await invoke("cmd_save_result", {
          actorId: currentUser.id,
          entry: {
            request_item_id: result.request_item_id,
            numeric_value: edit.numeric_value
              ? parseFloat(edit.numeric_value)
              : null,
            text_value: edit.text_value || null,
            notes: edit.notes || null,
            is_draft: false,
          },
        });
      }
      await invoke("cmd_finalize_results", {
        actorId: currentUser.id,
        requestId,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  }

  function openPrint() {
    if (!requestId) return;
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
    win.once("tauri://error", (e) => console.error("Print window:", e));
  }

  if (loading)
    return (
      <div className="page">
        <div className="users-loading">Loading results...</div>
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <div className="users-error">{error}</div>
      </div>
    );

  const allFinalized =
    data.results.length > 0 && data.results.every((r) => !r.is_draft && r.id);

  const emptyEdit = { numeric_value: "", text_value: "", notes: "" };
  const editFor = (r: Result_) => edits[r.request_item_id] ?? emptyEdit;
  const isFinal = (r: Result_) => !r.is_draft && !!r.id;

  const columns: Column<Result_>[] = [
    {
      key: "test",
      header: "Test",
      cell: (r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "var(--text-muted)" }}
          >
            {r.test_code}
          </span>
          <span style={{ fontWeight: 500 }}>{r.test_name}</span>
        </div>
      ),
    },
    {
      key: "result",
      header: "Result",
      className: "result-input-cell",
      cell: (r) =>
        r.unit ? (
          <input
            className="field__input result-input"
            type="number"
            step="any"
            value={editFor(r).numeric_value}
            onChange={(e) =>
              setEdit(r.request_item_id, "numeric_value", e.target.value)
            }
            disabled={isFinal(r)}
            placeholder="0.00"
          />
        ) : (
          <select
            className="field__input result-input"
            value={editFor(r).text_value}
            onChange={(e) =>
              setEdit(r.request_item_id, "text_value", e.target.value)
            }
            disabled={isFinal(r)}
          >
            <option value="">—</option>
            {TEXT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ),
    },
    {
      key: "unit",
      header: "Unit",
      cell: (r) => (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {r.unit ?? "—"}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference Range",
      cell: (r) => (
        <div style={{ fontSize: 12 }}>
          {r.ref_min != null && r.ref_max != null
            ? `${r.ref_min} – ${r.ref_max}`
            : "—"}
          {r.ref_age_group && (
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                display: "block",
                textTransform: "capitalize",
              }}
            >
              {r.ref_age_group} · {r.ref_gender}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "flag",
      header: "Flag",
      cell: (r) =>
        r.flag && r.flag !== "normal" ? (
          <span
            style={{
              color: FLAG_COLOR[r.flag],
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {FLAG_LABEL[r.flag]}
          </span>
        ) : r.flag === "normal" ? (
          <span style={{ color: "var(--success)", fontSize: 12 }}>✓</span>
        ) : (
          "—"
        ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (r) => (
        <input
          className="field__input result-input"
          value={editFor(r).notes}
          onChange={(e) => setEdit(r.request_item_id, "notes", e.target.value)}
          disabled={isFinal(r)}
          placeholder="Optional..."
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        isFinal(r) ? (
          <span className="status-badge status-badge--active">Final</span>
        ) : (
          <span className="status-badge status-badge--inactive">Draft</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (r) => {
        if (isFinal(r)) return null;
        const isSaving = saving === r.request_item_id;
        return (
          <div className="row-actions">
            <button
              className="action-btn"
              onClick={() => saveOne(r, true)}
              disabled={!!saving}
            >
              {isSaving ? "..." : "Draft"}
            </button>
            <button
              className="save-btn"
              style={{ height: 28, padding: "0 10px", fontSize: 12 }}
              onClick={() => saveOne(r, false)}
              disabled={!!saving}
            >
              {isSaving ? "..." : "Finalize"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <Page
      title="Results Entry"
      subtitle={`${data.request_no} — ${data.patient_name} (${data.patient_no})`}
      actionBtn={
        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          <button className="action-btn" onClick={() => navigate("/requests")}>
            ← Back
          </button>
          {allFinalized && (
            <button className="action-btn" onClick={openPrint}>
              🖨 Print Report
            </button>
          )}
          <button
            className="save-btn"
            onClick={finalizeAll}
            disabled={saving === "all"}
          >
            {saving === "all" ? "Finalizing..." : "Finalize All Results"}
          </button>
        </div>
      }
    >
      {error && <div className="users-error">{error}</div>}

      <div className="results-patient-bar">
        <span>
          Patient: <strong>{data.patient_name}</strong>
        </span>
        {data.patient_gender && (
          <span>
            Gender:{" "}
            <strong style={{ textTransform: "capitalize" }}>
              {data.patient_gender}
            </strong>
          </span>
        )}
        {(data.patient_dob || data.patient_age) && (
          <span>
            Age:{" "}
            <strong>
              {data.patient_dob
                ? calcAge(data.patient_dob)
                : `${data.patient_age}y (est.)`}
            </strong>
          </span>
        )}
      </div>

      <DataTable
        rows={data.results}
        columns={columns}
        getRowKey={(r) => r.request_item_id}
        rowClassName={(r) => (isFinal(r) ? "row--finalized" : undefined)}
        emptyState="No tests on this request."
      />
    </Page>
  );
}

function calcAge(dob: string): string {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const years = Math.floor(
    (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return `${years}y`;
}
