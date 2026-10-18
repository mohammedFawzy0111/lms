import { money } from "../../lib/format";
import type { Payment } from "./types";

interface Props {
  payments: Payment[];
  onReprint: (paymentId: string) => void;
}

export function PaymentHistory({ payments, onReprint }: Props) {
  return (
    <table className="mini-table">
      <thead>
        <tr>
          <th>Receipt #</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td className="cell-id">{p.receipt_no}</td>
            <td>{money(p.amount)}</td>
            <td className="capitalize">{p.method.replace(/_/g, " ")}</td>
            <td className="cell-muted">{p.paid_at}</td>
            <td>
              <button className="action-btn" onClick={() => onReprint(p.id)}>Reprint</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
