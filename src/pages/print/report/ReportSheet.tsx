import type { CSSProperties } from "react";
import { calcAge } from "../../patients/age";
import { formatDateTime } from "../../../lib/format";
import { FLAG_INFO, groupByCategory, isAbnormal, reportStatus } from "./helpers";
import { ResultsTable } from "./ResultsTable";
import type { Margins, PrintData, PrintMode } from "./types";

interface Props {
  data: PrintData;
  mode: PrintMode;
  margins: Margins;
  /** Time shown as "Printed", so every sheet in one print job carries the same one. */
  printedAt: Date;
}

function formatDob(dob: string): string {
  const d = new Date(dob);
  return isNaN(d.getTime()) ? dob : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rp-meta__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * One request's report on one paper "sheet". It knows nothing about windows or toolbars,
 * so several of them can be stacked in one window later (each sheet starts a new page).
 */
export function ReportSheet({ data, mode, margins, printedAt }: Props) {
  const { results: view, settings: lab } = data;
  const groups = groupByCategory(view.results);
  const abnormal = view.results.filter(isAbnormal);
  const status = reportStatus(view.results);
  const full = mode === "full";

  const age = calcAge({ date_of_birth: view.patient_dob, age_override: view.patient_age });
  const sex = view.patient_gender ? view.patient_gender[0].toUpperCase() + view.patient_gender.slice(1) : "—";
  const printed = formatDateTime(printedAt.toISOString());

  const style = {
    "--m-top": `${margins.top}mm`,
    "--m-bottom": `${margins.bottom}mm`,
    "--m-left": `${margins.left}mm`,
    "--m-right": `${margins.right}mm`,
  } as CSSProperties;

  return (
    <article className={`sheet rp rp--${mode}`} style={style}>
      <table className="rp-flow">
        <tbody>
          <tr>
            <td>
              {full && (
                <header className="rp-letterhead">
                  <div className="rp-letterhead__name">{lab.lab_name}</div>
                  <div className="rp-letterhead__contact">
                    {lab.lab_address && <div>{lab.lab_address}</div>}
                    {(lab.lab_phone || lab.lab_email) && (
                      <div>{[lab.lab_phone, lab.lab_email].filter(Boolean).join("  ·  ")}</div>
                    )}
                  </div>
                </header>
              )}

              <div className="rp-heading">
                <h1 className="rp-heading__title">Laboratory report</h1>
                <span className={`rp-status rp-status--${status}`}>{status === "final" ? "Final" : "Preliminary"}</span>
              </div>

              <dl className="rp-meta">
                <Row label="Patient" value={view.patient_name} />
                <Row label="Patient ID" value={view.patient_no} />
                <Row label="Age / sex" value={`${age} / ${sex}`} />
                <Row label="Date of birth" value={view.patient_dob ? formatDob(view.patient_dob) : "—"} />
                <Row label="Request" value={view.request_no} />
                <Row label="Printed" value={printed} />
              </dl>

              {status === "preliminary" && (
                <p className="rp-banner">
                  Some results are pending or not yet final. Values marked * are preliminary.
                </p>
              )}

              {groups.map((g) => (
                <ResultsTable key={g.name} group={g} />
              ))}

              {abnormal.length > 0 && (
                <section className="rp-notes">
                  <h3 className="rp-notes__title">Notes</h3>
                  <ul>
                    {abnormal.map((r) => (
                      <li key={r.test_code}>
                        {r.test_name} is {FLAG_INFO[r.flag!].remark}. Correlate clinically.
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {full && (
                <div className="rp-signatures">
                  <div>
                    <div className="rp-signatures__line" />
                    <div>Evaluated by</div>
                    <div className="rp-muted">Medical Technologist, MT</div>
                  </div>
                  <div>
                    <div className="rp-signatures__line" />
                    <div>Authorized by</div>
                    <div className="rp-muted">Pathologist, MD</div>
                  </div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
        {/* A table footer repeats at the bottom of every printed page, so each page names its patient. */}
        <tfoot>
          <tr>
            <td className="rp-runfoot">
              {view.patient_name} · {view.patient_no} · {view.request_no}
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
