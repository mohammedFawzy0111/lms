import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { PrintFrame, PrintMessage } from "./print/PrintFrame";
import { MarginControls, ModeSwitch } from "./print/report/PrintControls";
import { ReportSheet } from "./print/report/ReportSheet";
import { usePrintData } from "./print/report/usePrintData";
import { usePrintLayout } from "./print/report/usePrintLayout";
import "./styles/PrintReports.css";

export default function PrintReport() {
  const { requestId } = useParams<{ requestId: string }>();
  const actorId = useAuthStore((s) => s.session?.user.id) ?? "";
  const { data, loading, error } = usePrintData(requestId);
  const layout = usePrintLayout();
  const printedAt = useMemo(() => new Date(), []);

  if (loading) return <PrintMessage>Loading report...</PrintMessage>;
  if (!data) return <PrintMessage>{error ?? "Report not found."}</PrintMessage>;

  const { top, bottom, left, right } = layout.margins;
  // The margins live in @page so they repeat on every printed page, not just the first.
  const pageCss = `@page { size: A4; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }`;

  function handlePrint() {
    // Logging is best effort; it must never block printing.
    if (requestId) api("cmd_log_report", { actorId, requestId }).catch(() => {});
    window.print();
  }

  return (
    <PrintFrame
      title="Print preview"
      reference={data.results.request_no}
      pageCss={pageCss}
      onPrint={handlePrint}
      printLabel="Print / Save PDF"
      controls={<ModeSwitch mode={layout.mode} onChange={layout.setMode} />}
      extra={
        layout.mode === "template" ? (
          <MarginControls margins={layout.margins} onChange={layout.setTemplateMargin} onReset={layout.resetTemplate} />
        ) : undefined
      }
    >
      <ReportSheet data={data} mode={layout.mode} margins={layout.margins} printedAt={printedAt} />
    </PrintFrame>
  );
}
