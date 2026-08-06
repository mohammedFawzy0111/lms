import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./PrintReceipt.css";

interface Payment {
  id: string;
  receipt_no: string;
  amount: number;
  method: string;
  reference_note: string | null;
  received_by_name: string | null;
  paid_at: string;
}
interface LabSettings {
  lab_name: string;
  lab_address: string;
  lab_phone: string;
}
interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export default function PrintReceipt() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [settings, setSettings] = useState<LabSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    (async () => {
      const payRes = await invoke<ApiResult<Payment>>("cmd_get_payment", {
        id: paymentId,
      });
      if (!payRes.ok || !payRes.data) {
        setLoading(false);
        return;
      }
      setPayment(payRes.data);

      // We need the invoice — payment doesn't carry invoice_id in the response,
      // so this assumes the caller already has it; fall back gracefully otherwise.
      const settingsRes =
        await invoke<ApiResult<LabSettings>>("cmd_get_settings");
      if (settingsRes.ok && settingsRes.data) setSettings(settingsRes.data);

      setLoading(false);
    })();
  }, [paymentId]);

  function handlePrint() {
    window.print();
  }
  async function handleClose() {
    await getCurrentWindow().close();
  }

  if (loading) return <div className="receipt-loading">Loading receipt...</div>;
  if (!payment)
    return <div className="receipt-loading">Receipt not found.</div>;

  return (
    <div className="receipt-shell">
      <div className="receipt-toolbar no-print">
        <span>Receipt Preview</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="receipt-btn receipt-btn--secondary"
            onClick={handleClose}
          >
            Close
          </button>
          <button className="receipt-btn" onClick={handlePrint}>
            🖨 Print
          </button>
        </div>
      </div>

      <div className="receipt-page">
        <div className="receipt-header">
          <div className="receipt-lab-name">
            {settings?.lab_name ?? "Laboratory"}
          </div>
          {settings?.lab_address && (
            <div className="receipt-lab-line">{settings.lab_address}</div>
          )}
          {settings?.lab_phone && (
            <div className="receipt-lab-line">Tel: {settings.lab_phone}</div>
          )}
        </div>

        <div className="receipt-divider" />

        <div className="receipt-title">PAYMENT RECEIPT</div>

        <div className="receipt-row">
          <span>Receipt No</span>
          <span>{payment.receipt_no}</span>
        </div>
        <div className="receipt-row">
          <span>Date</span>
          <span>{payment.paid_at}</span>
        </div>
        <div className="receipt-row">
          <span>Received By</span>
          <span>{payment.received_by_name ?? "—"}</span>
        </div>

        <div className="receipt-divider--dashed" />

        <div className="receipt-row receipt-row--big">
          <span>Amount Paid</span>
          <span>${payment.amount.toFixed(2)}</span>
        </div>
        <div className="receipt-row">
          <span>Method</span>
          <span style={{ textTransform: "capitalize" }}>
            {payment.method.replace("_", " ")}
          </span>
        </div>
        {payment.reference_note && (
          <div className="receipt-row">
            <span>Note</span>
            <span>{payment.reference_note}</span>
          </div>
        )}

        <div className="receipt-divider--dashed" />

        <div className="receipt-footer">
          <p>Thank you</p>
          <p className="receipt-footer__small">
            *** Keep this receipt for your records ***
          </p>
        </div>
      </div>
    </div>
  );
}
