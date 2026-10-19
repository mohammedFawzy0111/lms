import { useState } from "react";
import { Page } from "../components/ui/Page";
import { api, errMsg } from "../lib/api";
import { useAuthStore, type User } from "../stores/authStore";
import { ChangePasswordModal } from "./users/ChangePasswordModal";
import { CreateUserModal } from "./users/CreateUserModal";
import { UsersTable } from "./users/UsersTable";
import { useUserList } from "./users/useUserList";
import "./styles/Users.css";

export default function Users() {
  const currentUser = useAuthStore((s) => s.session?.user);
  const { users, loading, error, setError, reload } = useUserList();
  const [showCreate, setShowCreate] = useState(false);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);

  async function toggleActive(u: User) {
    if (!currentUser) return;
    try {
      await api("cmd_set_user_active", { actorId: currentUser.id, targetId: u.id, active: !u.is_active });
      await reload();
    } catch (e) {
      setError(errMsg(e));
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

      <UsersTable
        rows={users}
        loading={loading}
        currentUserId={currentUser?.id}
        onToggleActive={toggleActive}
        onChangePassword={setPasswordFor}
      />

      {showCreate && (
        <CreateUserModal actorId={currentUser?.id ?? ""} onClose={() => setShowCreate(false)} onCreated={reload} />
      )}
      {passwordFor && <ChangePasswordModal user={passwordFor} onClose={() => setPasswordFor(null)} />}
    </Page>
  );
}
