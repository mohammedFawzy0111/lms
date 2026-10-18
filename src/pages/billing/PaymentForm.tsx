import { Field } from "../../components/ui/Field";
import { PAYMENT_METHODS } from "./constants";

export interface PaymentDraft {
  amount: string;
  method: string;
  note: string;
}

interface Props {
  value: PaymentDraft;
  onChange: (next: PaymentDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}

export function PaymentForm({ value, onChange, onSubmit, saving }: Props) {
  const set = (patch: Partial<PaymentDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="stack">
      <div className="modal-grid">
        <Field label="Amount">
          <input
            className="field__input"
            type="number"
            step="0.01"
            min="0"
            value={value.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </Field>
        <Field label="Method">
          <select
            className="field__input"
            value={value.method}
            onChange={(e) => set({ method: e.target.value })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Reference / Note" span={2}>
          <input
            className="field__input"
            value={value.note}
            placeholder="Optional"
            onChange={(e) => set({ note: e.target.value })}
          />
        </Field>
      </div>
      <div>
        <button className="save-btn" onClick={onSubmit} disabled={saving}>
          {saving ? "Recording..." : "Record Payment & Print Receipt"}
        </button>
      </div>
    </div>
  );
}
