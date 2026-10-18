import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DetailField } from "../../components/ui/DetailField";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import { dateOnly, money } from "../../lib/format";
import { StatusSelect } from "./StatusSelect";
import type { ReportLogEntry, RequestDetail } from "./types";

interface Props {
  requestId: string;
  actorId: string;
  onClose: () => void;
  /** Called after a status change so the list behind the modal can refresh. */
  onChanged: () => void;
  onPrint: (requestId: string) => void;
}

export function RequestDetailModal({ requestId, actorId, onClose, onChanged, onPrint }: Props) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [history, setHistory] = useState<ReportLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refreshes quietly: the modal keeps showing the old data instead of flashing "Loading...".
  const load = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([
        api<RequestDetail>("cmd_get_request", { id: requestId }),
        api<ReportLogEntry[]>("cmd_list_report_log", { requestId }),
      ]);
      setDetail(d);
      setHistory(h);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(cmd: string, args: Record<string, unknown>) {
    setError(null);
    try {
      await api(cmd, { actorId, ...args });
      await load();
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const changeStatus = (status: string) => update("cmd_update_request_status", { id: requestId, status });
  const changeItemStatus = (itemId: string, status: string) =>
    update("cmd_update_item_status", { itemId, status });

  return (
    <Modal
      size="wide"
      title={detail ? `${detail.request_no} — ${detail.patient.full_name}` : "Lab Request"}
      onClose={onClose}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>
            Close
          </button>
          {detail && (
            <button className="action-btn" onClick={() => navigate(`/billing?request=${detail.id}`)}>
              💳 Billing
            </button>
          )}
        </>
      }
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        {!detail ? (
          !error && <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="detail-grid">
              <DetailField label="Patient ID" value={detail.patient.patient_no} />
              <DetailField label="Priority" value={detail.priority} capitalize />
              <DetailField label="Request Date" value={dateOnly(detail.request_date)} />
              <DetailField label="Collection Date" value={dateOnly(detail.collection_date)} />
              <DetailField label="Due Date" value={dateOnly(detail.due_date)} />
              <DetailField label="Notes" value={detail.notes ?? "—"} />
            </div>

            <Field label="Overall Request Status">
              <StatusSelect value={detail.status} onChange={changeStatus} />
            </Field>

            <Field label="Test Items">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Test</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono">{item.test_code}</td>
                      <td>{item.test_name}</td>
                      <td>{money(item.price_at_order)}</td>
                      <td>
                        <StatusSelect
                          value={item.status}
                          onChange={(s) => changeItemStatus(item.id, s)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Field>

            {history.length > 0 && (
              <Field label={`Print History (${history.length})`}>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Printed By</th>
                      <th>Date & Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.generated_by_name ?? "Unknown"}</td>
                        <td className="cell-muted">{h.generated_at}</td>
                        <td>
                          <button className="action-btn" onClick={() => onPrint(detail.id)}>
                            Reprint
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Field>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
