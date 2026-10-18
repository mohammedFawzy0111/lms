import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Opens the print preview for a request's report in its own window. */
export function openReportWindow(requestId: string) {
  const win = new WebviewWindow(`print_${requestId.slice(0, 8)}`, {
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
