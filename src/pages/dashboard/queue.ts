import type { PendingResultEntry, QueueItem } from "./types";

/**
 * Group per-test rows into one item per request, keeping the backend's order
 * (urgent first, then oldest first).
 */
export function groupQueue(rows: PendingResultEntry[]): QueueItem[] {
  const byRequest = new Map<string, QueueItem>();
  for (const r of rows) {
    let item = byRequest.get(r.request_id);
    if (!item) {
      item = {
        request_id: r.request_id,
        request_no: r.request_no,
        patient_name: r.patient_name,
        urgent: r.priority === "urgent",
        tests: [],
      };
      byRequest.set(r.request_id, item);
    }
    item.tests.push(r.test_name);
  }
  return [...byRequest.values()];
}
