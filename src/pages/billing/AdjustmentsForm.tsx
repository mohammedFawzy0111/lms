import { Field } from "../../components/ui/Field";
import type { AdjustmentDraft } from "./types";

interface Props {
  value: AdjustmentDraft;
  onChange: (next: AdjustmentDraft) => void;
  onApply: () => void;
  saving: boolean;
}

export function AdjustmentsForm({ value, onChange, onApply, saving }: Props) {
  const set = (patch: Partial<AdjustmentDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="stack">
      <div className="modal-grid">
        <Field label="Discount Type">
          <select
            className="field__input"
            value={value.discountType}
            onChange={(e) => set({ discountType: e.target.value })}
          >
            <option value="fixed">Fixed Amount</option>
            <option value="percent">Percent</option>
          </select>
        </Field>
        <Field label="Discount Value">
          <input
            className="field__input"
            type="number"
            step="0.01"
            min="0"
            value={value.discountValue}
            onChange={(e) => set({ discountValue: e.target.value })}
          />
        </Field>
        <Field label="Tax %">
          <input
            className="field__input"
            type="number"
            step="0.01"
            min="0"
            value={value.taxPercent}
            onChange={(e) => set({ taxPercent: e.target.value })}
          />
        </Field>
        <Field label="Additional Fees">
          <input
            className="field__input"
            type="number"
            step="0.01"
            min="0"
            value={value.additionalFees}
            onChange={(e) => set({ additionalFees: e.target.value })}
          />
        </Field>
      </div>
      <div>
        <button className="action-btn" onClick={onApply} disabled={saving}>
          {saving ? "Saving..." : "Apply Adjustments"}
        </button>
      </div>
    </div>
  );
}
