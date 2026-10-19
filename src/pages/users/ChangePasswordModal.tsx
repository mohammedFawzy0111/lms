import { useEffect, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Notice";
import { api, errMsg } from "../../lib/api";
import { useEnterKeyNav } from "../../hooks/useEnterKeyNav";
import type { User } from "../../stores/authStore";

const FORM_ID = "change-password-form";

export function ChangePasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const enterKeyProps = useEnterKeyNav();

  // Close shortly after success; the cleanup cancels it if the user closes first.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const ready = !!oldPass && !!newPass && !!confirmPass;

  async function submit() {
    if (!ready || saving) return;
    if (newPass !== confirmPass) return setError("The new passwords don't match");
    setSaving(true);
    setError(null);
    try {
      await api("cmd_change_password", { userId: user.id, oldPassword: oldPass, newPassword: newPass });
      setDone(true);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={`Change Password — ${user.full_name}`}
      onClose={onClose}
      footer={
        done ? (
          <button className="action-btn" onClick={onClose}>Close</button>
        ) : (
          <>
            <button className="action-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" type="submit" form={FORM_ID} disabled={saving || !ready}>
              {saving ? "Saving..." : "Change Password"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <Notice tone="success">Password changed successfully</Notice>
      ) : (
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
          <Field label="Current Password">
            <input className="field__input" type="password" value={oldPass} autoFocus autoComplete="current-password" onChange={(e) => setOldPass(e.target.value)} />
          </Field>
          <Field label="New Password">
            <input className="field__input" type="password" value={newPass} autoComplete="new-password" onChange={(e) => setNewPass(e.target.value)} />
          </Field>
          <Field label="Confirm New Password">
            <input className="field__input" type="password" value={confirmPass} autoComplete="new-password" onChange={(e) => setConfirmPass(e.target.value)} />
          </Field>
        </form>
      )}
    </Modal>
  );
}
