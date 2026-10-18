import { useCallback, useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import { AGE_GROUPS, GENDERS } from "./types";
import type { Investigation, ReferenceRange } from "./types";

const EMPTY = { age_group: "adult", gender: "any", min_value: "", max_value: "" };
const numOrNull = (v: string) => (v === "" ? null : parseFloat(v));

export function ReferenceRangesModal({
  investigation,
  onClose,
}: {
  investigation: Investigation;
  onClose: () => void;
}) {
  const [ranges, setRanges] = useState<ReferenceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY);

  const load = useCallback(async () => {
    try {
      setRanges(
        await api<ReferenceRange[]>("cmd_list_reference_ranges", {
          investigationId: investigation.id,
        }),
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [investigation.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const addRange = () =>
    run(async () => {
      await api("cmd_add_reference_range", {
        investigationId: investigation.id,
        range: {
          age_group: draft.age_group,
          gender: draft.gender,
          min_value: numOrNull(draft.min_value),
          max_value: numOrNull(draft.max_value),
        },
      });
      setDraft(EMPTY);
    });

  const removeRange = (id: string) => run(() => api("cmd_delete_reference_range", { id }));

  const setField = (k: keyof typeof EMPTY, v: string) => setDraft((p) => ({ ...p, [k]: v }));

  return (
    <Modal
      size="wide"
      title={`Reference Ranges — ${investigation.test_name} (${investigation.unit ?? "no unit"})`}
      onClose={onClose}
      footer={<button className="action-btn" onClick={onClose}>Close</button>}
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <table className="mini-table">
            <thead>
              <tr>
                <th>Age Group</th>
                <th>Gender</th>
                <th>Min</th>
                <th>Max</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((r) => (
                <tr key={r.id}>
                  <td className="capitalize">{r.age_group}</td>
                  <td className="capitalize">{r.gender}</td>
                  <td>{r.min_value ?? "—"}</td>
                  <td>{r.max_value ?? "—"}</td>
                  <td>
                    <button className="action-btn" onClick={() => removeRange(r.id)}>Remove</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <select
                    className="field__input"
                    value={draft.age_group}
                    onChange={(e) => setField("age_group", e.target.value)}
                  >
                    {AGE_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="field__input"
                    value={draft.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="field__input"
                    type="number"
                    step="0.01"
                    value={draft.min_value}
                    onChange={(e) => setField("min_value", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="field__input"
                    type="number"
                    step="0.01"
                    value={draft.max_value}
                    onChange={(e) => setField("max_value", e.target.value)}
                  />
                </td>
                <td>
                  <button className="save-btn" onClick={addRange}>Add</button>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
