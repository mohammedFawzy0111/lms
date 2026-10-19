import { Activity } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { timeAgo } from "../../lib/format";
import { describeAction } from "./constants";
import type { RecentActivityEntry } from "./types";

export function ActivityFeed({ entries, loading }: { entries: RecentActivityEntry[]; loading: boolean }) {
  return (
    <Card title="Recent activity" icon={<Activity size={14} />}>
      {loading ? (
        <p className="dash-empty">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="dash-empty">Activity from you and your team will show up here.</p>
      ) : (
        <ul className="feed">
          {entries.map((a, i) => (
            <li key={i} className="feed__row">
              <span>
                <strong>{a.username ?? "System"}</strong> {describeAction(a.action)}
              </span>
              <time className="feed__time">{timeAgo(a.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
