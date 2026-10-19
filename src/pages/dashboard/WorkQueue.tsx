import { ChevronRight, ClipboardList } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { QUEUE_VISIBLE } from "./constants";
import type { QueueItem } from "./types";

interface Props {
  items: QueueItem[];
  loading: boolean;
  onOpen: (requestId: string) => void;
  onViewAll: () => void;
}

function testSummary(tests: string[]): string {
  const shown = tests.slice(0, 2).join(", ");
  return tests.length > 2 ? `${shown} +${tests.length - 2} more` : shown;
}

export function WorkQueue({ items, loading, onOpen, onViewAll }: Props) {
  const visible = items.slice(0, QUEUE_VISIBLE);
  const hidden = items.length - visible.length;

  return (
    <Card
      title="Waiting for results"
      icon={<ClipboardList size={14} />}
      action={
        <button className="link-btn" onClick={onViewAll}>
          All requests
        </button>
      }
    >
      {loading ? (
        <p className="dash-empty">Loading...</p>
      ) : visible.length === 0 ? (
        <div className="dash-empty">
          <p>Nothing is waiting. Requests show up here until all their results are final.</p>
          <button className="action-btn" onClick={onViewAll}>Go to requests</button>
        </div>
      ) : (
        <ul className="queue">
          {visible.map((q) => (
            <li key={q.request_id}>
              <button className={`queue__row${q.urgent ? " queue__row--urgent" : ""}`} onClick={() => onOpen(q.request_id)}>
                <span className="queue__who">
                  <span className="queue__name">{q.patient_name}</span>
                  <span className="cell-id">{q.request_no}</span>
                </span>
                <span className="queue__tests">{testSummary(q.tests)}</span>
                {q.urgent && <StatusBadge tone="danger">Urgent</StatusBadge>}
                <ChevronRight size={14} className="queue__go" aria-hidden />
              </button>
            </li>
          ))}
          {hidden > 0 && (
            <li className="queue__more">
              {hidden} more request{hidden === 1 ? "" : "s"} waiting. <button className="link-btn" onClick={onViewAll}>See all</button>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
