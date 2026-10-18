import { useCallback, useRef, useState } from "react";
import { api, errMsg } from "../../lib/api";
import type { Investigation } from "./types";

/**
 * Owns the investigations table data. Remembers the last category/search so
 * `reload()` (after a save, toggle, delete...) refreshes the same view the
 * user is looking at, and ignores responses that arrive out of order.
 */
export function useInvestigationList() {
  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ cat: string | null; q: string }>({ cat: null, q: "" });
  const seq = useRef(0);

  const load = useCallback(async (cat: string | null, q: string) => {
    last.current = { cat, q };
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await api<Investigation[]>("cmd_list_investigations", {
        categoryId: cat,
        search: q.trim() || null,
        includeInactive: true,
      });
      if (id === seq.current) setItems(rows);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(last.current.cat, last.current.q), [load]);

  return { items, loading, error, setError, load, reload };
}
