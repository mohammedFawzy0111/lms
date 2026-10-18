import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "../../lib/api";
import {
  EMPTY_EDIT,
  editFromResult,
  hasValue,
  isFinal,
  toEntry,
  type Edit,
  type RequestResultsView,
  type TestResult,
} from "./types";

/**
 * State and actions for entering results on one request.
 * `saving` is the request_item_id being saved, "all" while finalizing, or null.
 */
export function useResultsEntry(requestId: string | undefined, actorId: string) {
  const [data, setData] = useState<RequestResultsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const seq = useRef(0);

  /**
   * Fetch the view. `reseed` lists the rows whose inputs should be reset to the saved
   * values ("all" for every row). Other rows keep what the user has typed, so saving
   * one test never throws away unsaved input on the others.
   */
  const load = useCallback(
    async (reseed: "all" | string[]) => {
      if (!requestId) return;
      const id = ++seq.current;
      try {
        const view = await api<RequestResultsView>("cmd_get_request_results", { requestId });
        if (id !== seq.current) return;
        setData(view);
        setEdits((prev) => {
          const next: Record<string, Edit> = {};
          for (const r of view.results) {
            const keep = prev[r.request_item_id];
            const fresh = reseed === "all" || reseed.includes(r.request_item_id) || !keep;
            next[r.request_item_id] = fresh ? editFromResult(r) : keep;
          }
          return next;
        });
      } catch (e) {
        if (id === seq.current) setError(errMsg(e));
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [requestId],
  );

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError(null);
    load("all");
  }, [load]);

  const editFor = (r: TestResult) => edits[r.request_item_id] ?? EMPTY_EDIT;

  function setEdit(itemId: string, key: keyof Edit, value: string) {
    setEdits((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? EMPTY_EDIT), [key]: value } }));
  }

  async function saveOne(r: TestResult, isDraft: boolean) {
    if (!actorId) return;
    const edit = editFor(r);
    if (!isDraft && !hasValue(r, edit)) {
      return setError(`Enter a result for ${r.test_name} before finalizing it.`);
    }
    setSaving(r.request_item_id);
    setError(null);
    try {
      await api("cmd_save_result", { actorId, entry: toEntry(r, edit, isDraft) });
      await load([r.request_item_id]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(null);
    }
  }

  async function finalizeAll() {
    if (!actorId || !requestId || !data) return;
    const pending = data.results.filter((r) => !isFinal(r));
    const missing = pending.filter((r) => !hasValue(r, editFor(r)));
    if (missing.length > 0) {
      return setError(`Enter a result for: ${missing.map((m) => m.test_name).join(", ")}`);
    }
    setSaving("all");
    setError(null);
    try {
      // Only rows that are still open; final rows are locked and must not be rewritten.
      for (const r of pending) {
        await api("cmd_save_result", { actorId, entry: toEntry(r, editFor(r), false) });
      }
      await api("cmd_finalize_results", { actorId, requestId });
      await load("all");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(null);
    }
  }

  const allFinal = !!data && data.results.length > 0 && data.results.every(isFinal);

  return { data, loading, error, saving, editFor, setEdit, saveOne, finalizeAll, allFinal };
}
