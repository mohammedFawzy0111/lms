import { useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/ui/Page";
import { openReportWindow } from "../lib/printWindow";
import { useAuthStore } from "../stores/authStore";
import { PatientBar } from "./results/PatientBar";
import { ResultsTable } from "./results/ResultsTable";
import { useResultsEntry } from "./results/useResultsEntry";
import "./styles/Results.css";

export default function Results() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const actorId = useAuthStore((s) => s.session?.user.id ?? "");
  const { data, loading, error, saving, editFor, setEdit, saveOne, finalizeAll, allFinal } = useResultsEntry(
    requestId,
    actorId,
  );

  if (!data) {
    return (
      <Page title="Results Entry" actionBtn={<button className="action-btn" onClick={() => navigate("/requests")}>← Back</button>}>
        {loading ? <div className="loading">Loading results...</div> : <div className="error">{error ?? "Request not found"}</div>}
      </Page>
    );
  }

  return (
    <Page
      title="Results Entry"
      subtitle={`${data.request_no} — ${data.patient_name} (${data.patient_no})`}
      actionBtn={
        <>
          <button className="action-btn" onClick={() => navigate("/requests")}>← Back</button>
          {allFinal && (
            <button className="action-btn" onClick={() => requestId && openReportWindow(requestId)}>
              🖨 Print Report
            </button>
          )}
          <button className="save-btn" onClick={finalizeAll} disabled={!!saving || allFinal}>
            {saving === "all" ? "Finalizing..." : "Finalize All Results"}
          </button>
        </>
      }
    >
      {error && <div className="error">{error}</div>}
      <PatientBar data={data} />
      <ResultsTable rows={data.results} editFor={editFor} onEdit={setEdit} saving={saving} onSave={saveOne} />
    </Page>
  );
}
