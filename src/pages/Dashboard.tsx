import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Activity, Clock, AlertCircle } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import "./styles/Dashboard.css";

interface DashboardStats {
  today_patients:         number;
  today_revenue:          number;
  pending_investigations: number;
  completed_today:        number;
  monthly_patients:       number;
  monthly_revenue:        number;
}

interface RecentActivityEntry {
  action:      string;
  entity_type: string | null;
  username:    string | null;
  created_at:  string;
}

interface PendingResultEntry {
  request_id:   string;
  request_no:   string;
  patient_name: string;
  test_name:    string;
  priority:     string;
}

interface ApiResult<T> { ok: boolean; data: T | null; error: string | null; }

const ACTION_LABELS: Record<string, string> = {
  login_success: "logged in", login_failed: "failed login attempt", logout: "logged out",
  user_created: "created a user", patient_created: "registered a patient",
  patient_updated: "updated a patient", patient_deleted: "deleted a patient",
  request_created: "created a lab request", request_status_changed: "updated request status",
  results_finalized: "finalized results", investigation_created: "added a test",
  invoice_created: "created an invoice", payment_recorded: "recorded a payment",
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.session?.user);
  const navigate = useNavigate();

  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [activity,  setActivity]  = useState<RecentActivityEntry[]>([]);
  const [pending,   setPending]   = useState<PendingResultEntry[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, activityRes, pendingRes] = await Promise.all([
        invoke<ApiResult<DashboardStats>>("cmd_get_dashboard_stats"),
        invoke<ApiResult<RecentActivityEntry[]>>("cmd_get_recent_activity", { limit: 12 }),
        invoke<ApiResult<PendingResultEntry[]>>("cmd_get_pending_results", { limit: 8 }),
      ]);
      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (activityRes.ok && activityRes.data) setActivity(activityRes.data);
      if (pendingRes.ok && pendingRes.data) setPending(pendingRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const STATS = [
    { label: "Today's Patients",       value: stats?.today_patients ?? "—", color: "accent"  },
    { label: "Pending Investigations", value: stats?.pending_investigations ?? "—", color: "warning" },
    { label: "Completed Today",        value: stats?.completed_today ?? "—", color: "success" },
    { label: "Today's Revenue",        value: stats ? `$${stats.today_revenue.toFixed(2)}` : "—", color: "info" },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.full_name ?? "User"}</p>
        </div>
        <span className="page-date">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
      </header>

      <section className="dashboard-stats">
        {STATS.map((stat) => (
          <div key={stat.label} className={`stat-card stat-card--${stat.color}`}>
            <div className="stat-card__body">
              <span className="stat-card__value">{loading ? "—" : stat.value}</span>
              <span className="stat-card__label">{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      {stats && (
        <div className="dashboard-month-strip">
          <span>This Month: <strong>{stats.monthly_patients}</strong> patients</span>
          <span>·</span>
          <span>Revenue: <strong>${stats.monthly_revenue.toFixed(2)}</strong></span>
        </div>
      )}

      <section className="dashboard-grid">
        <div className="card dashboard-card">
          <div className="card__header">
            <Activity size={14} style={{ marginRight: 8, color: "var(--accent)" }} />
            Recent Activity
          </div>
          <div className="dashboard-list">
            {loading ? (
              <div className="dashboard-empty"><p>Loading...</p></div>
            ) : activity.length === 0 ? (
              <div className="dashboard-empty"><p>No recent activity</p></div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="activity-row">
                  <span className="activity-row__text">
                    <strong>{a.username ?? "System"}</strong> {ACTION_LABELS[a.action] ?? a.action.replace(/_/g, " ")}
                  </span>
                  <span className="activity-row__time">{formatTime(a.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="card__header">
            <Clock size={14} style={{ marginRight: 8, color: "var(--warning)" }} />
            Pending Results
          </div>
          <div className="dashboard-list">
            {loading ? (
              <div className="dashboard-empty"><p>Loading...</p></div>
            ) : pending.length === 0 ? (
              <div className="dashboard-empty"><p>No pending results</p></div>
            ) : (
              pending.map((p) => (
                <div
                  key={p.request_id + p.test_name}
                  className="activity-row activity-row--clickable"
                  onClick={() => navigate(`/results/${p.request_id}`)}
                >
                  <span className="activity-row__text">
                    <strong>{p.patient_name}</strong> — {p.test_name}
                    {p.priority === "urgent" && <AlertCircle size={12} style={{ color: "var(--danger)", marginLeft: 6, display: "inline" }} />}
                  </span>
                  <span className="activity-row__time font-mono">{p.request_no}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts.replace(" ", "T"));
  if (isNaN(d.getTime())) return ts;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}
