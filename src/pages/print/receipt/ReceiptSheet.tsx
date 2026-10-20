import { formatDateTime, money } from "../../../lib/format";

export interface ReceiptPayment {
  id: string;
  receipt_no: string;
  amount: number;
  method: string;
  reference_note: string | null;
  received_by_name: string | null;
  paid_at: string;
}

export interface ReceiptLab {
  lab_name: string;
  lab_address: string;
  lab_phone: string;
}

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rc-line${strong ? " rc-line--strong" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** An 80 mm thermal receipt. Plain black on white, no tints. */
export function ReceiptSheet({ payment, lab }: { payment: ReceiptPayment; lab: ReceiptLab | null }) {
  return (
    <article className="rc">
      <header className="rc-head">
        <div className="rc-head__name">{lab?.lab_name || "Laboratory"}</div>
        {lab?.lab_address && <div>{lab.lab_address}</div>}
        {lab?.lab_phone && <div>Tel: {lab.lab_phone}</div>}
      </header>

      <div className="rc-title">Payment receipt</div>

      <Line label="Receipt no." value={payment.receipt_no} />
      <Line label="Date" value={formatDateTime(payment.paid_at)} />
      <Line label="Received by" value={payment.received_by_name ?? "—"} />

      <hr className="rc-rule" />

      <Line strong label="Amount paid" value={money(payment.amount)} />
      <Line label="Method" value={sentenceCase(payment.method.replace(/_/g, " "))} />
      {payment.reference_note && <Line label="Note" value={payment.reference_note} />}

      <hr className="rc-rule" />

      <footer className="rc-foot">
        <div>Thank you</div>
        <div className="rc-foot__small">Please keep this receipt for your records.</div>
      </footer>
    </article>
  );
}
