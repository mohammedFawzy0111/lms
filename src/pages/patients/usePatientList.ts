import { useCallback, useRef, useState } from "react";
import { api, errMsg } from "../../lib/api";
import type { Patient } from "./types";

/**
 * Owns the patients table data. Empty query lists, otherwise searches.
 * Remembers the last query so `reload()` refreshes what the user is looking at,
 * and drops out-of-order responses.
 */
export function usePatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const last = useRef("");
  const seq = useRef(0);

  const load = useCallback(async (q: string) => {
    last.current = q;
    const id = ++seq.current;
    const term = q.trim();
    setLoading(true);
    setError(null);
    try {
      const rows = term
        ? await api<Patient[]>("cmd_search_patients", { query: term, limit: 100 })
        : await api<Patient[]>("cmd_list_patients", { limit: 100, offset: 0 });
      if (id === seq.current) setPatients(rows);
    } catch (e) {
      if (id === seq.current) setError(errMsg(e));
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(last.current), [load]);

  return { patients, loading, error, setError, load, reload };
}
