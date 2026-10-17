import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore, User } from "../stores/authStore";
import { useEnterKeyNav } from "../hooks/useEnterKeyNav";
import { Page } from "../components/ui/Page";
import { DataTable } from "../components/ui/CustomTable";

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

const ROLES = ["admin", "technician", "receptionist", "readonly"] as const;
type Role = (typeof ROLES)[number];

const ROLE_COLOR: Record<Role, string> = {
  admin: "var(--accent)",
  technician: "var(--info)",
  receptionist: "var(--warning)",
  readonly: "var(--text-muted)",
};

export default function Users() {
  const currentUser = useAuthStore((s) => s.session?.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showChange, setShowChange] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<User[]>>("cmd_list_users");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      setUsers(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: User) {
    if (!currentUser) return;
    try {
      await invoke("cmd_set_user_active", {
        actorId: currentUser.id,
        targetId: u.id,
        active: !u.is_active,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Page
      title="Users"
      subtitle="Manage system accounts"
      actionBtn={
        <button className="save-btn" onClick={() => setShowCreate(true)}>
          + New User
        </button>
      }
    >
      {error && <div className="error">{error}</div>}

      <DataTable
        rows={users}
        columns={[
          { key: "full_name", header: "Name", cell: (row) => <div className="user-cell">
              <div className="user-avatar">
                {row.full_name.charAt(0).toUpperCase()}
              </div>
              <span>{row.full_name}</span>
            </div> },
          { key: "username", header: "Username", cell: (row) => <span className="font-mono" style={{ fontSize: 12 }}>{row.username}</span> },
          { key: "role", header: "Role", cell: (row) => <span
            className="role-badge"
            style={{ color: ROLE_COLOR[row.role as Role] }}
          >
            {row.role}
          </span> },
          { key: "status", header: "Status", cell: (row) => <span
            className={`status-badge status-badge--${row.is_active ? "active" : "inactive"}`}
          >
            {row.is_active ? "Active" : "Inactive"}
          </span> },
          { key: "created_at", header: "Created", cell: (row) => <span
            style={{ color: "var(--text-muted)", fontSize: 12 }}
          >
            {row.created_at.split(" ")[0]}
          </span> },
          { key: "actions", header: "Actions", cell: (row) => <div className="row-actions">
              <button
                className="action-btn"
                onClick={() => toggleActive(row)}
                disabled={row.id == currentUser?.id}
                title={row.is_active ? "Deactivate" : "Activate"}
              >
                {row.is_active ? "Disable" : "Enable"}
              </button>
              <button
                className="action-btn"
                onClick={() => setShowChange(row)}
                title="Change password"
              >
                Password
              </button>
            </div>
          }
        ]}
        loadingState={loading}
        getRowKey={(u) => u.id}
        emptyState="No users found."
      />

      {showCreate && (
        <CreateUserModal
          actorId={currentUser?.id ?? ""}
          onClose={() => setShowCreate(false)}
          onCreate={load}
        />
      )}

      {showChange && (
        <ChangePasswordModal
          user={showChange}
          onClose={() => setShowChange(null)}
        />
      )}
    </Page>
  );
}

// -----create user modal -------------------------------------------
function CreateUserModal({
  actorId,
  onClose,
  onCreate,
}: {
  actorId: String;
  onClose: () => void;
  onCreate: () => void;
}) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "technician",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<String | null>(null);
  const enterKeyProps = useEnterKeyNav();

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<User>>("cmd_create_user", {
        actorId,
        username: form.username,
        password: form.password,
        fullName: form.full_name,
        role: form.role,
      });

      if (!res.ok) throw new Error(res.error ?? "Failed");
      onCreate();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">New User</div>
        <div className="modal__body">
          {error && (
            <div className="error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div className="modal-grid" {...enterKeyProps}>
            {(
              [
                ["full_name", "Full Name", "text", "Dr. John Doe"],
                ["username", "Username", "text", "jdoe"],
                ["password", "Password", "password", "**********"],
              ] as const
            ).map(([key, label, type, placeholder]) => (
              <div className="field" key={key}>
                <label className="field__label">{label}</label>
                <input
                  className="field__input"
                  type={type}
                  value={form[key as keyof typeof form]}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}

            <div className="field">
              <label className="field__label">Role</label>
              <select
                className="field__input"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="action-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={submit}
            disabled={
              loading || !form.username || !form.password || !form.full_name
            }
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

//-------------- change password modal ------------------------------------------------
function ChangePasswordModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const enterKeyProps = useEnterKeyNav();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<ApiResult<boolean>>("cmd_change_password", {
        userId: user.id,
        oldPassword: oldPass,
        newPassword: newPass,
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">Change Password - {user.full_name}</div>
        <div className="modal__body">
          {error && (
            <div className="error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          {done ? (
            <p
              style={{
                color: "var(--success)",
                textAlign: "center",
                padding: "1rem",
              }}
            >
              ✔️ Password changed successfully
            </p>
          ) : (
            <div className="modal-grid" {...enterKeyProps}>
              <div className="field">
                <label className="field__label">Current Password</label>
                <input
                  className="field__input"
                  type="password"
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="**************"
                />
              </div>

              <div className="field">
                <label className="field__label">New Password</label>
                <input
                  className="field__input"
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="**************"
                />
              </div>
            </div>
          )}
        </div>
        {!done && (
          <div className="modal__footer">
            <button className="action-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="save-btn"
              onClick={submit}
              disabled={loading || !oldPass || !newPass}
            >
              {loading ? "Saving..." : "Change Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
