import { DataTable } from "../../components/ui/CustomTable";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { dateOnly } from "../../lib/format";
import type { User } from "../../stores/authStore";

interface Props {
  rows: User[];
  loading: boolean;
  currentUserId: string | undefined;
  onToggleActive: (u: User) => void;
  onChangePassword: (u: User) => void;
}

export function UsersTable({ rows, loading, currentUserId, onToggleActive, onChangePassword }: Props) {
  return (
    <DataTable
      rows={rows}
      loadingState={loading}
      getRowKey={(u) => u.id}
      emptyState="No users found."
      columns={[
        {
          key: "full_name",
          header: "Name",
          cell: (u) => (
            <div className="user-cell">
              <div className="user-avatar">{u.full_name.charAt(0).toUpperCase()}</div>
              <span>{u.full_name}</span>
            </div>
          ),
        },
        { key: "username", header: "Username", cell: (u) => <span className="font-mono cell-muted">{u.username}</span> },
        { key: "role", header: "Role", cell: (u) => <span className={`role-badge role-badge--${u.role}`}>{u.role}</span> },
        {
          key: "status",
          header: "Status",
          cell: (u) => (
            <StatusBadge tone={u.is_active ? "success" : "default"}>{u.is_active ? "Active" : "Inactive"}</StatusBadge>
          ),
        },
        { key: "created_at", header: "Created", className: "col-hide-sm", cell: (u) => <span className="cell-muted nowrap">{dateOnly(u.created_at)}</span> },
        {
          key: "actions",
          header: "Actions",
          cell: (u) => (
            <div className="row-actions">
              <button
                className="action-btn"
                disabled={u.id === currentUserId}
                title={u.id === currentUserId ? "You can't disable your own account" : undefined}
                onClick={() => onToggleActive(u)}
              >
                {u.is_active ? "Disable" : "Enable"}
              </button>
              <button className="action-btn" onClick={() => onChangePassword(u)}>Password</button>
            </div>
          ),
        },
      ]}
    />
  );
}
