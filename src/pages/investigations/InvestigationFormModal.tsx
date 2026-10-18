import { useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import type { Category, Investigation, NewInvestigation } from "./types";

interface Props {
  /** null = create a new investigation */
  investigation: Investigation | null;
  categories: Category[];
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
  /** Called after a category is added from inside this form. */
  onCategoryCreated: () => void;
}

const numOrNull = (v: string) => (v === "" ? null : parseFloat(v));

export function InvestigationFormModal({
  investigation,
  categories,
  actorId,
  onClose,
  onSaved,
  onCategoryCreated,
}: Props) {
  const isEdit = !!investigation;
  const [form, setForm] = useState<NewInvestigation>({
    test_code: investigation?.test_code ?? "",
    test_name: investigation?.test_name ?? "",
    category_id: investigation?.category_id ?? null,
    description: investigation?.description ?? "",
    unit: investigation?.unit ?? "",
    cost: investigation?.cost ?? 0,
    result_type: investigation?.result_type ?? "numeric",
    critical_low: investigation?.critical_low ?? null,
    critical_high: investigation?.critical_high ?? null,
  });
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof NewInvestigation>(k: K, v: NewInvestigation[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    try {
      const cat = await api<Category>("cmd_create_category", { name: newCatName.trim() });
      set("category_id", cat.id);
      setNewCatName("");
      onCategoryCreated();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await api("cmd_update_investigation", { actorId, id: investigation.id, inv: form });
      else await api("cmd_create_investigation", { actorId, inv: form });
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      size="wide"
      title={isEdit ? `Edit Test — ${investigation.test_code}` : "New Investigation"}
      onClose={onClose}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button
            className="save-btn"
            onClick={submit}
            disabled={saving || !form.test_code.trim() || !form.test_name.trim()}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Test"}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        <div className="modal-grid modal-grid--3">
          <Field label="Test Code *">
            <input
              className="field__input"
              value={form.test_code}
              onChange={(e) => set("test_code", e.target.value.toUpperCase())}
              placeholder="HGB"
            />
          </Field>
          <Field label="Test Name *" span={2}>
            <input
              className="field__input"
              value={form.test_name}
              onChange={(e) => set("test_name", e.target.value)}
              placeholder="Hemoglobin"
            />
          </Field>

          <Field label="Category">
            <select
              className="field__input"
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value || null)}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="field field--span2 field--row">
            <input
              className="field__input"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="Add new category..."
            />
            <button type="button" className="action-btn" onClick={addCategory}>Add</button>
          </div>

          <Field label="Unit">
            <input
              className="field__input"
              value={form.unit ?? ""}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="g/dL"
            />
          </Field>
          <Field label="Cost">
            <input
              className="field__input"
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => set("cost", parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Result Type">
            <select
              className="field__input"
              value={form.result_type}
              onChange={(e) => set("result_type", e.target.value)}
            >
              <option value="numeric">Numeric</option>
              <option value="text">Text</option>
              <option value="multi_field">Multi-field</option>
            </select>
          </Field>

          <Field label="Critical Low">
            <input
              className="field__input"
              type="number"
              step="0.01"
              value={form.critical_low ?? ""}
              onChange={(e) => set("critical_low", numOrNull(e.target.value))}
            />
          </Field>
          <Field label="Critical High">
            <input
              className="field__input"
              type="number"
              step="0.01"
              value={form.critical_high ?? ""}
              onChange={(e) => set("critical_high", numOrNull(e.target.value))}
            />
          </Field>

          <Field label="Description" span={3}>
            <textarea
              className="field__input field__textarea"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes about this test..."
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
