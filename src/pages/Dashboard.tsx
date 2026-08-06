import { useAuthStore } from "../stores/authStore";
import "./styles/Dashboard.css";

export default function Dashboard() {
  const user = useAuthStore((s) => s.session?.user);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Welcome back, {user?.full_name ?? "User"}</p>
        </div>
        <span className="page-date">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", year: "numeric",
            month: "long", day: "numeric",
          })}
        </span>
      </header>

      <div className="stat-grid">
        {[
          { label: "Today's Patients", value: "—", color: "accent" },
          { label: "Pending Investigations", value: "—", color: "warning" },
          { label: "Completed Today", value: "—", color: "success" },
          { label: "Today's Revenue", value: "—", color: "info" },
        ].map((s) => (
          <div key={s.label} className={`stat-card stat-card--${s.color}`}>
            <span className="stat-card__value">{s.value}</span>
            <span className="stat-card__label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="dash-empty">
        <p>More modules coming in the next phases.</p>
      </div>
    </div>
  );
}
