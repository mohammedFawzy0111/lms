import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, errMsg } from "../lib/api";
import { PrintFrame, PrintMessage } from "./print/PrintFrame";
import { ReceiptSheet, type ReceiptLab, type ReceiptPayment } from "./print/receipt/ReceiptSheet";
import "./styles/PrintReceipt.css";

// 80 mm wide, as tall as the receipt needs; margin 0 because thermal printers add their own.
const PAGE_CSS = "@page { size: 80mm auto; margin: 0; }";

export default function PrintReceipt() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<ReceiptPayment | null>(null);
  const [lab, setLab] = useState<ReceiptLab | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let live = true;
    (async () => {
      try {
        const p = await api<ReceiptPayment>("cmd_get_payment", { id: paymentId });
        if (live) setPayment(p);
        // The header is nice to have; a failed settings call shouldn't stop the receipt.
        const l = await api<ReceiptLab>("cmd_get_settings").catch(() => null);
        if (live) setLab(l);
      } catch (e) {
        if (live) setError(errMsg(e));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [paymentId]);

  if (loading) return <PrintMessage>Loading receipt...</PrintMessage>;
  if (!payment) return <PrintMessage>{error ?? "Receipt not found."}</PrintMessage>;

  return (
    <PrintFrame title="Receipt preview" reference={payment.receipt_no} pageCss={PAGE_CSS} onPrint={() => window.print()}>
      <div className="sheet rc-sheet">
        <ReceiptSheet payment={payment} lab={lab} />
      </div>
    </PrintFrame>
  );
}
