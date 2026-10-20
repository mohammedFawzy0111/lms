import type { ReactNode } from "react";
import { closeThisWindow } from "../../lib/printWindow";
import "../styles/Print.css";

interface Props {
  /** "Print preview" style heading and a small reference (request or receipt number). */
  title: string;
  reference?: string;
  /** Controls between the title and the buttons (mode switch etc.). */
  controls?: ReactNode;
  /** A second toolbar row, e.g. margin inputs. */
  extra?: ReactNode;
  /** CSS for the paper (for example an @page rule); rendered inside the frame. */
  pageCss: string;
  onPrint: () => void;
  printLabel?: string;
  children: ReactNode;
}

/**
 * Window chrome shared by every printable page: a white toolbar, a quiet grey desk and the
 * sheet(s) on it. Nothing here prints; only `children` do.
 */
export function PrintFrame({ title, reference, controls, extra, pageCss, onPrint, printLabel = "Print", children }: Props) {
  return (
    <div className="print-root">
      <style>{pageCss}</style>
      <header className="print-toolbar no-print">
        <div className="print-toolbar__row">
          <div className="print-toolbar__title">
            <strong>{title}</strong>
            {reference && <span>{reference}</span>}
          </div>
          {controls}
          <div className="print-toolbar__actions">
            <button className="print-btn" onClick={closeThisWindow}>Close</button>
            <button className="print-btn print-btn--primary" onClick={onPrint}>{printLabel}</button>
          </div>
        </div>
        {extra && <div className="print-toolbar__row print-toolbar__row--extra">{extra}</div>}
      </header>
      <main className="print-desk">{children}</main>
    </div>
  );
}

/** Full-window message ("Loading...", "Report not found"). */
export function PrintMessage({ children }: { children: ReactNode }) {
  return <div className="print-root print-message">{children}</div>;
}
