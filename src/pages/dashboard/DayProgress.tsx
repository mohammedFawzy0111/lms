import { CheckCircle2, Clock } from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { money } from "../../lib/format";
import type { DashboardStats } from "./types";

interface Props {
  stats: DashboardStats | null;
  loading: boolean;
  /** Requests in the queue that are urgent (counted from the rows we fetched). */
  urgentRequests: number;
  /** True when more tests are pending than we fetched, so urgentRequests is a lower bound. */
  urgentIsPartial: boolean;
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="figure">
      <span className="figure__label">{label}</span>
      <span className="figure__value">{value}</span>
      <span className="figure__note">{note}</span>
    </div>
  );
}

/**
 * The first thing on the page: how much work is waiting, and how today is going.
 * Solid = done, striped = waiting. Pattern plus labels, so it doesn't rely on green vs amber.
 */
export function DayProgress({ stats, loading, urgentRequests, urgentIsPartial }: Props) {
  if (!stats) {
    return (
      <section className="day card">
        <h2 className="day__headline">{loading ? "Loading..." : "Today's numbers aren't available"}</h2>
      </section>
    );
  }

  const done = stats.completed_today;
  const waiting = stats.pending_investigation;
  const total = done + waiting;

  return (
    <section className="day card">
      <div className="day__main">
        <div className="day__top">
          <h2 className="day__headline">
            {waiting === 0
              ? "No tests are waiting for results"
              : `${waiting} test${waiting === 1 ? "" : "s"} waiting for results`}
          </h2>
          {urgentRequests > 0 && (
            <StatusBadge tone="danger">
              {urgentRequests}
              {urgentIsPartial ? "+" : ""} urgent
            </StatusBadge>
          )}
        </div>

        <div
          className="meter"
          role="img"
          aria-label={`${done} completed today, ${waiting} waiting for results`}
        >
          {total > 0 && (
            <>
              {done > 0 && <span className="meter__done" style={{ flexGrow: done }} />}
              {waiting > 0 && <span className="meter__waiting" style={{ flexGrow: waiting }} />}
            </>
          )}
        </div>

        <div className="day__legend">
          <span>
            <CheckCircle2 size={13} className="icon--done" /> {done} completed today
          </span>
          <span>
            <Clock size={13} className="icon--waiting" /> {waiting} waiting
          </span>
        </div>
      </div>

      <div className="day__figures">
        <Figure label="Patients today" value={String(stats.today_patients)} note={`${stats.monthly_patients} this month`} />
        <Figure label="Revenue today" value={money(stats.today_revenue)} note={`${money(stats.monthly_revenue)} this month`} />
      </div>
    </section>
  );
}
