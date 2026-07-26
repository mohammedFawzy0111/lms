import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAuthStore } from "../stores/authStore";
import "./PrintReports.css";

interface Result_ {
  test_code:     string;
  test_name:     string;
  category_name: string | null;
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
}

interface LabSettings {
  lab_name:    string;
  lab_address: string;
  lab_phone:   string;
  lab_email:   string;
  print_mode?: string;
}

interface PrintData {
  results:  RequestResultsView;
  settings: LabSettings;
}

interface ApiResult<T> { ok: boolean; data: T | null; error: string | null; }

const FLAG_LABELS: Record<string, string> = {
  low: "LOW", high: "HIGH", critical_low: "CRIT LOW", critical_high: "CRIT HIGH",
};

export default function PrintReport() {
  const { requestId } = useParams<{ requestId: string }>();
  const [data,    setData]    = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState<"full" | "template">("full");
  const currentUserId = useAuthStore((s) => s.session?.user.id) ?? "";

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
    if(requestId) {
      invoke("cmd_log_report", {actorId: currentUserId, requestId}).catch(()=>{});
    }
    window.print();
  }
  async function handleClose() { await getCurrentWindow().destroy(); }

  if (loading) return <div className="print-loading">Loading report...</div>;
  if (!data)   return <div className="print-loading">Failed to load report.</div>;

  const { results: view, settings } = data;

  // Group results by category, preserving encounter order
  const groups: { name: string; items: Result_[] }[] = [];
  for (const r of view.results) {
    const catName = r.category_name ?? "General";
    let group = groups.find((g) => g.name === catName);
    if (!group) { group = { name: catName, items: [] }; groups.push(group); }
    group.items.push(r);
  }

  // Collect abnormal findings for the notes section
  const abnormal = view.results.filter((r) => r.flag && r.flag !== "normal");

  const ageDisplay = view.patient_dob
    ? `${calcAge(view.patient_dob)}`
    : view.patient_age ? `${view.patient_age}y (est.)` : "—";

  return (
    <div className="print-shell">
      <div className="print-toolbar no-print">
        <div>
          <span className="print-toolbar__title">Print Preview</span>
          <span className="print-toolbar__req">{view.request_no}</span>
        </div>

        <div className="print-mode-switch">
          <button className={`print-mode-btn ${mode === "full" ? "print-mode-btn--active" : ""}`} onClick={() => setMode("full")}>
            Full Report
          </button>
          <button className={`print-mode-btn ${mode === "template" ? "print-mode-btn--active" : ""}`} onClick={() => setMode("template")}>
            Preprinted Paper
          </button>
        </div>

        <div className="print-toolbar__actions">
          <button className="print-btn print-btn--secondary" onClick={handleClose}>Close</button>
          <button className="print-btn" onClick={handlePrint}>🖨 Print / Save PDF</button>
        </div>
      </div>

      <div className={`print-page ${mode === "template" ? "print-page--template" : ""}`}>

        {mode === "full" && (
          <>
            <div className="print-title">LAB INVESTIGATION RESULTS</div>
            <div className="print-lab-block">
              <div className="print-lab-block__name">{settings.lab_name}</div>
              {settings.lab_address && <p>{settings.lab_address}</p>}
              <p>
                {settings.lab_phone && <span>{settings.lab_phone}</span>}
                {settings.lab_phone && settings.lab_email && <span>  ·  </span>}
                {settings.lab_email && <span>{settings.lab_email}</span>}
              </p>
            </div>
          </>
        )}

        {/* Patient info box */}
        <div className="print-info-box">
          <div className="print-info-row">
            <div className="print-info-cell print-info-cell--shaded">
              <span className="print-info-label">Patient Name:</span>
              <span className="print-info-value">{view.patient_name}</span>
            </div>
            <div className="print-info-cell">
              <span className="print-info-label">Patient ID:</span>
              <span className="print-info-value">{view.patient_no}</span>
            </div>
          </div>
          <div className="print-info-row">
            <div className="print-info-cell print-info-cell--shaded">
              <span className="print-info-label">DOB / Age / Sex:</span>
              <span className="print-info-value">
                {view.patient_dob ? formatDob(view.patient_dob) : "—"} ({ageDisplay}) / {view.patient_gender ? view.patient_gender.charAt(0).toUpperCase() : "—"}
              </span>
            </div>
            <div className="print-info-cell">
              <span className="print-info-label">Request No:</span>
              <span className="print-info-value">{view.request_no}</span>
            </div>
          </div>
          <div className="print-info-row">
            <div className="print-info-cell print-info-cell--shaded">
              <span className="print-info-label">Report Status:</span>
              <span className="print-info-value">Final</span>
            </div>
            <div className="print-info-cell">
              <span className="print-info-label">Print Date:</span>
              <span className="print-info-value">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Results grouped by category */}
        {groups.map((group) => (
          <div key={group.name}>
            <div className="print-section-header">{group.name}</div>
            <table className="print-results-table">
              <thead>
                <tr>
                  <th style={{ width: "34%" }}>Test / Parameter</th>
                  <th style={{ width: "16%" }}>Result</th>
                  <th style={{ width: "14%" }}>Units</th>
                  <th style={{ width: "26%" }}>Reference Range</th>
                  <th style={{ width: "10%" }}>Flag</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((r) => {
                  const isAbnormal = !!r.flag && r.flag !== "normal";
                  return (
                    <tr key={r.test_code} className={isAbnormal ? "abnormal" : ""}>
                      <td>{r.test_name}</td>
                      <td>{r.numeric_value != null ? r.numeric_value : (r.text_value ?? "—")}</td>
                      <td>{r.unit ?? "—"}</td>
                      <td>{r.ref_min != null && r.ref_max != null ? `${r.ref_min}–${r.ref_max}` : "—"}</td>
                      <td className="print-flag-cell">
                        {r.flag && r.flag !== "normal" ? (FLAG_LABELS[r.flag] ?? r.flag.toUpperCase()) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Notes / remarks — only if there are abnormal findings */}
        {abnormal.length > 0 && (
          <div className="print-notes">
            <div className="print-notes__title">Notes &amp; Remarks:</div>
            {abnormal.map((r) => (
              <p key={r.test_code}>
                * {r.test_name} {r.flag === "high" || r.flag === "critical_high" ? "elevated" : "low"}; correlate clinically with patient symptoms.
              </p>
            ))}
          </div>
        )}

        {mode === "full" && (
          <>
            <div className="print-signatures">
              <div>
                <div className="print-sig__line" />
                <div className="print-sig__label">Evaluated By: _______________________</div>
                <div className="print-sig__role">Medical Technologist, MT</div>
              </div>
              <div>
                <div className="print-sig__line" />
                <div className="print-sig__label">Authorized By: _______________________</div>
                <div className="print-sig__role">Pathologist, MD</div>
              </div>
            </div>

            <div className="print-footer">
              <span>Page 1 of 1</span>
              <span>Generated: {new Date().toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function calcAge(dob: string): string {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "—";
  const years = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years}Y`;
}

function formatDob(dob: string): string {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}
