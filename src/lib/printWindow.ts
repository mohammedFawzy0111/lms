import { getCurrentWindow } from "@tauri-apps/api/window";
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

/** Opens the printable receipt for a payment in its own window. */
export function openReceiptWindow(paymentId: string) {
  const win = new WebviewWindow(`receipt_${paymentId.slice(0, 8)}`, {
    url: `/#/receipt/${paymentId}`,
    title: "Print Receipt",
    width: 420,
    height: 640,
    center: true,
    decorations: true,
    resizable: true,
  });
  win.once("tauri://error", (e) => console.error("Receipt window error:", e));
}

/** Close the window this code runs in (used by the Close button of print windows). */
export async function closeThisWindow() {
  try {
    await getCurrentWindow().close();
  } catch {
    window.close();
  }
}
