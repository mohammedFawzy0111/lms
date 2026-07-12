import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./PrintReports.css";

interface Result_ {
  test_code:     string;
  test_name:     string;
  unit:          string | null;
  numeric_value: number | null;
  text_value:    string | null;
  flag:          string | null;
  is_draft:      boolean;
  ref_min:       number | null;
  ref_max:       number | null;
}

interface RequestResultsView {
  request_no:     string;
  patient_name:   string;
  patient_no:     string;
  patient_dob:    string | null;
  patient_age:    number | null;
  patient_gender: string | null;
  results:        Result_[];
  request_date?:  string;
}

interface LabSettings {
  lab_name:    string;
  lab_address: string;
  lab_phone:   string;
  lab_email:   string;
  print_mode?:  string;
}

interface PrintData {
  results:  RequestResultsView;
  settings: LabSettings;
}

interface ApiResult<T> { ok: boolean; data: T | null; error: string | null; }

const FLAG_LABELS: Record<string, string> = {
  low: "LOW ↓", high: "HIGH ↑", critical_low: "CRITICAL LOW ↓↓", critical_high: "CRITICAL HIGH ↑↑",
};

export default function PrintReport() {
  const { requestId } = useParams<{ requestId: string }>();
  const [data,    setData]    = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState<"full" | "template">("full");

  useEffect(() => {
    if (!requestId) return;
    invoke<ApiResult<PrintData>>("cmd_get_print_data", { requestId }).then((res) => {
      if (res.ok && res.data) {
        setData(res.data);
        setMode((res.data.settings.print_mode as "full" | "template") ?? "full");
      }
      setLoading(false);
    });
  }, [requestId]);

  function handlePrint() {
    window.print();
  }

  async function handleClose() {
    await getCurrentWindow().close();
  }

  if (loading) return <div className="print-loading">Loading report...</div>;
  if (!data)   return <div className="print-loading">Failed to load report.</div>;

  const { results: view, settings } = data;
  const printMode = mode;

  return (
    <div className="print-shell">
      {/* Toolbar — hidden on print */}
      <div className="print-toolbar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Print Preview</span>
          <span style={{ fontSize: 12, color: "#666" }}>{view.request_no}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" value="full"     checked={printMode === "full"}     onChange={() => setMode("full")} />
            Full Report
          </label>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" value="template" checked={printMode === "template"} onChange={() => setMode("template")} />
            Preprinted Paper
          </label>
          <button className="print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
          <button className="print-btn print-btn--secondary" onClick={handleClose}>Close</button>
        </div>
      </div>

      {/* Report page */}
      <div className={`print-page ${printMode === "template" ? "print-page--template" : ""}`}>

        {/* Header — only in full mode */}
        {printMode === "full" && (
          <div className="print-header">
            <div className="print-header__lab">
              <h1 className="print-lab-name">{settings.lab_name}</h1>
              {settings.lab_address && <p>{settings.lab_address}</p>}
              <p>
                {settings.lab_phone && <span>Tel: {settings.lab_phone}</span>}
                {settings.lab_phone && settings.lab_email && <span> · </span>}
                {settings.lab_email && <span>Email: {settings.lab_email}</span>}
              </p>
            </div>
            <div className="print-header__title">
              <h2>LABORATORY REPORT</h2>
              <p>Report No: <strong>{view.request_no}</strong></p>
              <p>Date: <strong>{new Date().toLocaleDateString()}</strong></p>
            </div>
          </div>
        )}

        <div className="print-divider" />

        {/* Patient info */}
        <div className="print-patient">
          <div className="print-patient__row">
            <div className="print-patient__field">
              <span className="print-label">Patient Name</span>
              <span className="print-value">{view.patient_name}</span>
            </div>
            <div className="print-patient__field">
              <span className="print-label">Patient ID</span>
              <span className="print-value">{view.patient_no}</span>
            </div>
            <div className="print-patient__field">
              <span className="print-label">Gender</span>
              <span className="print-value" style={{ textTransform: "capitalize" }}>{view.patient_gender ?? "—"}</span>
            </div>
            <div className="print-patient__field">
              <span className="print-label">Age</span>
              <span className="print-value">
                {view.patient_dob ? calcAge(view.patient_dob) : view.patient_age ? `${view.patient_age}y (est.)` : "—"}
              </span>
            </div>
          </div>
          <div className="print-patient__row">
            <div className="print-patient__field">
              <span className="print-label">Request No</span>
              <span className="print-value">{view.request_no}</span>
            </div>
            <div className="print-patient__field">
              <span className="print-label">Print Date</span>
              <span className="print-value">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="print-divider" />

        {/* Results table */}
        <table className="print-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {view.results.map((r) => (
              <tr key={r.test_code} className={r.flag && r.flag !== "normal" ? "print-row--abnormal" : ""}>
                <td>
                  <span className="print-test-code">{r.test_code}</span>
                  <span className="print-test-name">{r.test_name}</span>
                </td>
                <td className="print-value-cell">
                  <strong>{r.numeric_value != null ? r.numeric_value : (r.text_value ?? "—")}</strong>
                </td>
                <td>{r.unit ?? "—"}</td>
                <td>
                  {r.ref_min != null && r.ref_max != null
                    ? `${r.ref_min} – ${r.ref_max}`
                    : "—"}
                </td>
                <td className={`print-flag print-flag--${r.flag ?? "normal"}`}>
                  {r.flag && r.flag !== "normal" ? FLAG_LABELS[r.flag] ?? r.flag : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-divider" />

        {/* Signature area */}
        {printMode === "full" && (
          <div className="print-signatures">
            <div className="print-sig">
              <div className="print-sig__line" />
              <span>Technician Signature</span>
            </div>
            <div className="print-sig">
              <div className="print-sig__line" />
              <span>Authorized By</span>
            </div>
            <div className="print-sig">
              <div className="print-sig__line" />
              <span>Date</span>
            </div>
          </div>
        )}

        {/* Footer — only in full mode */}
        {printMode === "full" && (
          <div className="print-footer">
            <p>This report is generated by {settings.lab_name}. For queries, contact {settings.lab_phone || settings.lab_email || "the laboratory"}.</p>
            <p style={{ marginTop: 4, fontSize: 9 }}>*** End of Report ***</p>
          </div>
        )}
      </div>
    </div>
  );
}

function calcAge(dob: string): string {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years}y`;
}

