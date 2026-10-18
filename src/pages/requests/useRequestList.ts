import { useCallback, useRef, useState } from "react";
import { api, errMsg } from "../../lib/api";
import type { LabRequest } from "./types";

/**
 * Owns the requests table data. Remembers the last status/search so `reload()`
 * refreshes the view the user is looking at, and drops out-of-order responses.
 */
export function useRequestList() {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const last = useRef({ status: "", q: "" });
  const seq = useRef(0);

  const load = useCallback(async (status: string, q: string) => {
    last.current = { status, q };
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await api<LabRequest[]>("cmd_list_requests", {
        status: status || null,
        search: q.trim() || null,
        limit: 100,
      });
      if (id === seq.current) setRequests(rows);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(last.current.status, last.current.q), [load]);

  return { requests, loading, error, load, reload };
}
