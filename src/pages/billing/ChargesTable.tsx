import { money } from "../../lib/format";
import type { InvoiceLineItem } from "./types";

export function ChargesTable({ items, subtotal }: { items: InvoiceLineItem[]; subtotal: number }) {
  return (
    <table className="mini-table">
      <thead>
        <tr>
          <th>Test</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {items.map((li) => (
          <tr key={li.test_code}>
            <td>
              {li.test_name} <span className="cell-id">({li.test_code})</span>
            </td>
            <td>{money(li.price)}</td>
          </tr>
        ))}
        <tr className="mini-table__total">
          <td>Subtotal</td>
          <td>{money(subtotal)}</td>
        </tr>
      </tbody>
    </table>
  );
}
