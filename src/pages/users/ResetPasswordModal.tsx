import { useEffect, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Notice";
import { api, errMsg } from "../../lib/api";
import { useEnterKeyNav } from "../../hooks/useEnterKeyNav";
import type { User } from "../../stores/authStore";

const FORM_ID = "reset-password-form";

interface Props {
  user: User;
  actorId: string;
  onClose: () => void;
}

export function ResetPasswordModal({ user, actorId, onClose }: Props) {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const enterKeyProps = useEnterKeyNav();

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const ready = !!newPass && !!confirmPass;

  async function submit() {
    if (!ready || saving) return;
    if (newPass !== confirmPass)
      return setError("The new passwords don't match");
    setSaving(true);
    setError(null);
    try {
      await api("cmd_reset_password", {
        userId: user.id,
        actorId,
        newPassword: newPass,
      });
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
      title={`Reset Password — ${user.full_name}`}
      onClose={onClose}
      footer={
        done ? (
          <button className="action-btn" onClick={onClose}>
            Close
          </button>
        ) : (
          <>
            <button className="action-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-btn"
              type="submit"
              form={FORM_ID}
              disabled={saving || !ready}
            >
              {saving ? "Saving..." : "Reset Password"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <Notice tone="success">
          Password reset. {user.full_name} has been signed out and must log in
          with the new password.
        </Notice>
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
          <Field label="New Password">
            <input
              className="field__input"
              type="password"
              value={newPass}
              autoFocus
              autoComplete="new-password"
              onChange={(e) => setNewPass(e.target.value)}
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              className="field__input"
              type="password"
              value={confirmPass}
              autoComplete="new-password"
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </Field>
        </form>
      )}
    </Modal>
  );
}
