import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import { money } from "../../lib/format";
import { openReceiptWindow } from "../../lib/printWindow";
import { AdjustmentsForm } from "./AdjustmentsForm";
import { ChargesTable } from "./ChargesTable";
import { PaymentForm, type PaymentDraft } from "./PaymentForm";
import { PaymentHistory } from "./PaymentHistory";
import type { AdjustmentDraft, InvoiceDetail, Payment } from "./types";

interface Props {
  invoiceId: string;
  actorId: string;
  onClose: () => void;
  onChanged: () => void;
}

const num = (s: string) => parseFloat(s) || 0;

export function InvoiceDetailModal({ invoiceId, actorId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adj, setAdj] = useState<AdjustmentDraft>({
    discountType: "fixed",
    discountValue: "0",
    taxPercent: "0",
    additionalFees: "0",
  });
  const [pay, setPay] = useState<PaymentDraft>({ amount: "", method: "cash", note: "" });
  const [savingAdj, setSavingAdj] = useState(false);
  const [paying, setPaying] = useState(false);

  // Refetch without blanking the modal, so forms don't flash after each save.
  const load = useCallback(async () => {
    try {
      const d = await api<InvoiceDetail>("cmd_get_invoice", { id: invoiceId });
      const inv = d.invoice;
      setDetail(d);
      setAdj({
        discountType: inv.discount_type,
        discountValue: String(inv.discount_value),
        taxPercent: String(inv.tax_percent),
        additionalFees: String(inv.additional_fees),
      });
      // Suggest the remaining balance (toFixed avoids 12.299999999 float noise).
      setPay((p) => ({ ...p, amount: inv.balance > 0 ? inv.balance.toFixed(2) : "" }));
    } catch (e) {
      setError(errMsg(e));
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAdjustments() {
    setSavingAdj(true);
    setError(null);
    try {
      await api("cmd_update_invoice_adjustments", {
        actorId,
        invoiceId,
        discountType: adj.discountType,
        discountValue: num(adj.discountValue),
        taxPercent: num(adj.taxPercent),
        additionalFees: num(adj.additionalFees),
      });
      await load();
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSavingAdj(false);
    }
  }

  async function recordPayment() {
    if (!detail) return;
    const amount = num(pay.amount);
    if (amount <= 0) return setError("Enter a valid payment amount");
    if (amount > detail.invoice.balance + 0.005) {
      return setError(`Amount exceeds the balance (${money(detail.invoice.balance)})`);
    }
    setPaying(true);
    setError(null);
    try {
      const payment = await api<Payment>("cmd_record_payment", {
        actorId,
        payment: {
          invoice_id: invoiceId,
          amount,
          method: pay.method,
          reference_note: pay.note.trim() || null,
        },
      });
      setPay((p) => ({ ...p, note: "" }));
      await load();
      onChanged();
      openReceiptWindow(payment.id);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setPaying(false);
    }
  }

  if (!detail) {
    return (
      <Modal title="Invoice" onClose={onClose} size="wide" footer={<button className="action-btn" onClick={onClose}>Close</button>}>
        {error ? <div className="error">{error}</div> : <div className="loading">Loading...</div>}
      </Modal>
    );
  }

  const { invoice, line_items, payments } = detail;

  return (
    <Modal
      size="wide"
      onClose={onClose}
      title={
        <>
          {invoice.invoice_no} — {invoice.patient_name}{" "}
          <span className="cell-id">({invoice.patient_no})</span>
        </>
      }
      footer={<button className="action-btn" onClick={onClose}>Close</button>}
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        <section className="billing-section">
          <h4 className="billing-section__title">Charges</h4>
          <ChargesTable items={line_items} subtotal={invoice.subtotal} />
        </section>

        <section className="billing-section">
          <h4 className="billing-section__title">Discount, Tax &amp; Fees</h4>
          <AdjustmentsForm value={adj} onChange={setAdj} onApply={saveAdjustments} saving={savingAdj} />
        </section>

        <div className="billing-summary">
          <div>
            <span>Total</span>
            <strong>{money(invoice.total)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong className="amount--paid">{money(invoice.amount_paid)}</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong className={invoice.balance > 0 ? "amount--due" : "cell-muted"}>{money(invoice.balance)}</strong>
          </div>
        </div>

        {invoice.balance > 0 && (
          <section className="billing-section">
            <h4 className="billing-section__title">Record Payment</h4>
            <PaymentForm value={pay} onChange={setPay} onSubmit={recordPayment} saving={paying} />
          </section>
        )}

        {payments.length > 0 && (
          <section className="billing-section">
            <h4 className="billing-section__title">Payment History</h4>
            <PaymentHistory payments={payments} onReprint={openReceiptWindow} />
          </section>
        )}
      </div>
    </Modal>
  );
}
