import { useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import { useEnterKeyNav } from "../../hooks/useEnterKeyNav";
import type { User } from "../../stores/authStore";
import { ROLES } from "./constants";

interface Props {
  actorId: string;
  onClose: () => void;
  onCreated: () => void;
}

const FORM_ID = "create-user-form";

export function CreateUserModal({ actorId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ full_name: "", username: "", password: "", role: "technician" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enterKeyProps = useEnterKeyNav();

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const ready = !!form.full_name.trim() && !!form.username.trim() && !!form.password;

  async function submit() {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api<User>("cmd_create_user", {
        actorId,
        username: form.username.trim(),
        password: form.password,
        fullName: form.full_name.trim(),
        role: form.role,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New User"
      onClose={onClose}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="save-btn" type="submit" form={FORM_ID} disabled={saving || !ready}>
            {saving ? "Creating..." : "Create User"}
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="stack"
        {...enterKeyProps}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {error && <div className="error">{error}</div>}
        {/* Password last, so Enter on it submits (Enter on earlier fields moves to the next one). */}
        <div className="modal-grid">
          <Field label="Full Name">
            <input className="field__input" value={form.full_name} placeholder="Dr. John Doe" autoFocus onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Username">
            <input className="field__input" value={form.username} placeholder="jdoe" autoComplete="off" onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label="Role">
            <select className="field__input capitalize" value={form.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Password">
            <input className="field__input" type="password" value={form.password} placeholder="••••••••" autoComplete="new-password" onChange={(e) => set("password", e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
