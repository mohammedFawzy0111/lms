import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../components/ui/Page";
import { useAuthStore } from "../stores/authStore";
import { ActivityFeed } from "./dashboard/ActivityFeed";
import { PENDING_FETCH_LIMIT } from "./dashboard/constants";
import { DayProgress } from "./dashboard/DayProgress";
import { groupQueue } from "./dashboard/queue";
import { useDashboard } from "./dashboard/useDashboard";
import { WorkQueue } from "./dashboard/WorkQueue";
import "./styles/Dashboard.css";

const TODAY = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export default function Dashboard() {
  const user = useAuthStore((s) => s.session?.user);
  const navigate = useNavigate();
  const { stats, activity, pending, loading, error } = useDashboard();

  const queue = useMemo(() => groupQueue(pending), [pending]);
  const urgentRequests = queue.filter((q) => q.urgent).length;
  const truncated = !!stats && pending.length >= PENDING_FETCH_LIMIT && stats.pending_investigation > pending.length;

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome back, ${user?.full_name ?? "User"}`}
      actionBtn={<span className="page-date">{TODAY()}</span>}
    >
      <div className="dash">
        {error && <div className="error">{error}</div>}

        <DayProgress stats={stats} loading={loading} urgentRequests={urgentRequests} urgentIsPartial={truncated} />

        <div className="dash__grid">
          <WorkQueue
            items={queue}
            loading={loading}
            onOpen={(id) => navigate(`/results/${id}`)}
            onViewAll={() => navigate("/requests")}
          />
          <ActivityFeed entries={activity} loading={loading} />
        </div>
      </div>
    </Page>
  );
}
