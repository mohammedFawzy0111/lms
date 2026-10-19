import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "../../lib/api";
import type { User } from "../../stores/authStore";

export function useUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setUsers(await api<User[]>("cmd_list_users"));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { users, loading, error, setError, reload };
}
