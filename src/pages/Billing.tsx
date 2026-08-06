import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../stores/authStore";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./Billing.css";
import "./Dashboard.css";
import "./Patients.css";

interface Invoice {
  id: string; invoice_no: string; request_id: string; request_no: string;
  patient_name: string; patient_no: string;
  subtotal: number; discount_type: string; discount_value: number;
  tax_percent: number; additional_fees: number; total: number;
  amount_paid: number; balance: number; status: string;
  notes: string | null; created_at: string;
}

interface InvoiceLineItem { test_code: string; test_name: string; price: number; }
interface Payment {
  id: string; receipt_no: string; amount: number; method: string;
  reference_note: string | null; received_by_name: string | null; paid_at: string;
}
interface InvoiceDetail { invoice: Invoice; line_items: InvoiceLineItem[]; payments: Payment[]; }

interface ApiResult<T> { ok: boolean; data: T | null; error: string | null; }

const STATUS_COLORS: Record<string, string> = {
  unpaid: "inactive", partial: "warning" as any, paid: "active", cancelled: "inactive",
};

export default function Billing() {
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.session?.user);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async (status: string, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<Invoice[]>>("cmd_list_invoices", {
        status: status || null, search: q.trim() || null, limit: 100,
      });
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load");
      setInvoices(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(statusFilter, query), 200);
    return () => clearTimeout(t);
  }, [statusFilter, query, load]);

  // Deep-link from Requests page: ?request=<id> auto-creates/opens the invoice
  useEffect(() => {
    const requestId = searchParams.get("request");
    if (!requestId || !currentUser) return;

    (async () => {
      const existing = await invoke<ApiResult<string | null>>("cmd_get_invoice_by_request", { requestId });
      if (existing.ok && existing.data) {
        setDetailId(existing.data);
      } else {
        const created = await invoke<ApiResult<InvoiceDetail>>("cmd_create_invoice", {
          actorId: currentUser.id,
          invoice: {
            request_id: requestId, discount_type: "fixed", discount_value: 0,
            tax_percent: 0, additional_fees: 0, notes: null,
          },
        });
        if (created.ok && created.data) {
          setDetailId(created.data.invoice.id);
          load(statusFilter, query);
        }
      }
    })();
  }, [searchParams, currentUser]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-sub">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <div className="inv-toolbar">
        <div className="cat-tabs">
          <button className={`cat-tab ${statusFilter === "" ? "cat-tab--active" : ""}`} onClick={() => setStatusFilter("")}>All</button>
          <button className={`cat-tab ${statusFilter === "unpaid" ? "cat-tab--active" : ""}`} onClick={() => setStatusFilter("unpaid")}>Unpaid</button>
          <button className={`cat-tab ${statusFilter === "partial" ? "cat-tab--active" : ""}`} onClick={() => setStatusFilter("partial")}>Partial</button>
          <button className={`cat-tab ${statusFilter === "paid" ? "cat-tab--active" : ""}`} onClick={() => setStatusFilter("paid")}>Paid</button>
        </div>
        <input className="field__input inv-search" placeholder="Search patient, invoice #..."
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {error && <div className="users-error">{error}</div>}

      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loading">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="users-loading">No invoices found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr><th>Invoice #</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{inv.invoice_no}</span></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{inv.patient_name}</span>
                      <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.patient_no}</span>
                    </div>
                  </td>
                  <td>${inv.total.toFixed(2)}</td>
                  <td style={{ color: "var(--success)" }}>${inv.amount_paid.toFixed(2)}</td>
                  <td style={{ color: inv.balance > 0 ? "var(--warning)" : "var(--text-muted)" }}>${inv.balance.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-badge--${STATUS_COLORS[inv.status] ?? "inactive"}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => setDetailId(inv.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          actorId={currentUser?.id ?? ""}
          onClose={() => setDetailId(null)}
          onChanged={() => load(statusFilter, query)}
        />
      )}
    </div>
  );
}

function InvoiceDetailModal({ invoiceId, actorId, onClose, onChanged }: {
  invoiceId: string; actorId: string; onClose: () => void; onChanged: () => void;
}) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adjustment form
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [additionalFees, setAdditionalFees] = useState("0");
  const [savingAdj, setSavingAdj] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [payingLoading, setPayingLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<ApiResult<InvoiceDetail>>("cmd_get_invoice", { id: invoiceId });
      if (res.ok && res.data) {
        setDetail(res.data);
        setDiscountType(res.data.invoice.discount_type);
        setDiscountValue(String(res.data.invoice.discount_value));
        setTaxPercent(String(res.data.invoice.tax_percent));
        setAdditionalFees(String(res.data.invoice.additional_fees));
        setPayAmount(res.data.invoice.balance > 0 ? String(res.data.invoice.balance) : "");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [invoiceId]);

  async function saveAdjustments() {
    setSavingAdj(true);
    setError(null);
    try {
      await invoke("cmd_update_invoice_adjustments", {
        actorId, invoiceId,
        discountType: discountType, discountValue: parseFloat(discountValue) || 0,
        taxPercent: parseFloat(taxPercent) || 0, additionalFees: parseFloat(additionalFees) || 0,
      });
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingAdj(false);
    }
  }

  async function recordPayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { setError("Enter a valid payment amount"); return; }
    setPayingLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<Payment>>("cmd_record_payment", {
        actorId,
        payment: { invoice_id: invoiceId, amount, method: payMethod, reference_note: payNote || null },
      });
      if (!res.ok) throw new Error(res.error ?? "Failed to record payment");
      await load();
      onChanged();
      // Auto-open receipt for the new payment
      if (res.data) openReceipt(res.data.id);
      setPayAmount("");
      setPayNote("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPayingLoading(false);
    }
  }

  function openReceipt(paymentId: string) {
    const label = `receipt_${paymentId.slice(0, 8)}`;
    const win = new WebviewWindow(label, {
      url: `/#/receipt/${paymentId}`,
      title: "Print Receipt",
      width: 420,
      height: 640,
      center: true,
      decorations: true,
      resizable: true,
    });
    win.once("tauri://error", (e) => console.error("Receipt window:", e));
  }

  if (loading || !detail) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal__body"><div className="users-loading">Loading...</div></div>
        </div>
      </div>
    );
  }

  const { invoice, line_items, payments } = detail;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          {invoice.invoice_no} — {invoice.patient_name}
          <span className="font-mono" style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>({invoice.patient_no})</span>
        </div>
        <div className="modal__body">
          {error && <div className="users-error" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Line items */}
          <label className="field__label" style={{ marginBottom: 8, display: "block" }}>Charges</label>
          <table className="ranges-table" style={{ marginBottom: 16 }}>
            <thead><tr><th>Test</th><th>Price</th></tr></thead>
            <tbody>
              {line_items.map((li) => (
                <tr key={li.test_code}>
                  <td>{li.test_name} <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>({li.test_code})</span></td>
                  <td>${li.price.toFixed(2)}</td>
                </tr>
              ))}
              <tr><td style={{ fontWeight: 600 }}>Subtotal</td><td style={{ fontWeight: 600 }}>${invoice.subtotal.toFixed(2)}</td></tr>
            </tbody>
          </table>

          {/* Adjustments */}
          <label className="field__label" style={{ marginBottom: 8, display: "block" }}>Discount, Tax & Fees</label>
          <div className="modal-grid" style={{ marginBottom: 8 }}>
            <div className="field">
              <label className="field__label">Discount Type</label>
              <select className="field__input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="fixed">Fixed Amount</option>
                <option value="percent">Percent</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label">Discount Value</label>
              <input className="field__input" type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Tax %</label>
              <input className="field__input" type="number" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Additional Fees</label>
              <input className="field__input" type="number" step="0.01" value={additionalFees} onChange={(e) => setAdditionalFees(e.target.value)} />
            </div>
          </div>
          <button className="action-btn" onClick={saveAdjustments} disabled={savingAdj} style={{ marginBottom: 16 }}>
            {savingAdj ? "Saving..." : "Apply Adjustments"}
          </button>

          {/* Totals summary */}
          <div className="billing-summary">
            <div><span>Total</span><strong>${invoice.total.toFixed(2)}</strong></div>
            <div><span>Paid</span><strong style={{ color: "var(--success)" }}>${invoice.amount_paid.toFixed(2)}</strong></div>
            <div><span>Balance</span><strong style={{ color: invoice.balance > 0 ? "var(--warning)" : "var(--text-muted)" }}>${invoice.balance.toFixed(2)}</strong></div>
          </div>

          {/* Record payment */}
          {invoice.balance > 0 && (
            <>
              <label className="field__label" style={{ margin: "16px 0 8px", display: "block" }}>Record Payment</label>
              <div className="modal-grid">
                <div className="field">
                  <label className="field__label">Amount</label>
                  <input className="field__input" type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field__label">Method</label>
                  <select className="field__input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field field--span2">
                  <label className="field__label">Reference / Note</label>
                  <input className="field__input" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <button className="save-btn" onClick={recordPayment} disabled={payingLoading} style={{ marginTop: 10 }}>
                {payingLoading ? "Recording..." : "Record Payment & Print Receipt"}
              </button>
            </>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <>
              <label className="field__label" style={{ margin: "20px 0 8px", display: "block" }}>Payment History</label>
              <table className="ranges-table">
                <thead><tr><th>Receipt #</th><th>Amount</th><th>Method</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono" style={{ fontSize: 12 }}>{p.receipt_no}</td>
                      <td>${p.amount.toFixed(2)}</td>
                      <td style={{ textTransform: "capitalize" }}>{p.method.replace("_", " ")}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.paid_at}</td>
                      <td><button className="action-btn" onClick={() => openReceipt(p.id)}>Reprint</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
