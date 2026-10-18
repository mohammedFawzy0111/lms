import { useCallback, useRef, useState } from "react";
import { api, errMsg } from "../../lib/api";
import type { Invoice } from "./types";

/**
 * Owns the invoices table data. Remembers the last status/search so `reload()`
 * refreshes the view the user is looking at, and drops out-of-order responses.
 */
export function useInvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      const rows = await api<Invoice[]>("cmd_list_invoices", {
        status: status || null,
        search: q.trim() || null,
        limit: 100,
      });
      if (id === seq.current) setInvoices(rows);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(last.current.status, last.current.q), [load]);

  return { invoices, loading, error, load, reload };
}
