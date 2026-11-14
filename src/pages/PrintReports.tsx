import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Notice } from "../components/ui/Notice";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { PrintFrame, PrintMessage } from "./print/PrintFrame";
import { MarginControls, ModeSwitch } from "./print/report/PrintControls";
import { ReportSheet } from "./print/report/ReportSheet";
import { usePrintData } from "./print/report/usePrintData";
import { usePrintLayout } from "./print/report/usePrintLayout";
import "./styles/PrintReports.css";

/**
 * /print/:requestId     one report
 * /print?ids=a,b,c      several reports in one window, each starting on its own page
 */
export default function PrintReport() {
  const { requestId } = useParams<{ requestId: string }>();
  const [search] = useSearchParams();
  const idsParam = search.get("ids") ?? "";

  const ids = useMemo(
    () => (requestId ? [requestId] : idsParam.split(",").filter(Boolean)),
    [requestId, idsParam],
  );

  const actorId = useAuthStore((s) => s.session?.user.id) ?? "";
  const { items, failed, loading } = usePrintData(ids);
  const layout = usePrintLayout();
  const printedAt = useMemo(() => new Date(), []);

  if (loading)
    return (
      <PrintMessage>
        Loading {ids.length > 1 ? "reports" : "report"}...
      </PrintMessage>
    );
  if (items.length === 0) return <PrintMessage>Report not found.</PrintMessage>;

  const { top, bottom, left, right } = layout.margins;
  // The margins live in @page so they repeat on every printed page, not just the first.
  const pageCss = `@page { size: A4; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; }`;

  const many = items.length > 1;

  function handlePrint() {
    // Logging is best effort; it must never block printing.
    items.forEach((it) =>
      api("cmd_log_report", { actorId, requestId: it.id }).catch(() => {}),
    );
    window.print();
  }

  return (
    <PrintFrame
      title="Print preview"
      reference={
        many ? `${items.length} reports` : items[0].data.results.request_no
      }
      pageCss={pageCss}
      onPrint={handlePrint}
      printLabel={many ? `Print ${items.length} reports` : "Print / Save PDF"}
      controls={<ModeSwitch mode={layout.mode} onChange={layout.setMode} />}
      extra={
        layout.mode === "template" ? (
          <MarginControls
            margins={layout.margins}
            onChange={layout.setTemplateMargin}
            onReset={layout.resetTemplate}
          />
        ) : undefined
      }
    >
      {failed.length > 0 && (
        <div className="no-print">
          <Notice tone="error">
            {failed.length} of {ids.length} reports could not be loaded and are
            not included.
          </Notice>
        </div>
      )}
      {items.map((it) => (
        <ReportSheet
          key={it.id}
          data={it.data}
          mode={layout.mode}
          margins={layout.margins}
          printedAt={printedAt}
        />
      ))}
    </PrintFrame>
  );
}
