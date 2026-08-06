import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight,
  FlaskConical, UserPlus, TestTube2, ClipboardList, Receipt
} from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useAuthStore } from "../stores/authStore";
import { useSettingsStore } from "../stores/settingsStore";
import "./styles/Shell.css";

const NAV = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={15} />, end: true },
  { to: "/requests", label: "Requests", icon: <ClipboardList size={15} /> },
  { to: "/billing", label: "Billing", icon: <Receipt size={15} /> },
  { to: "/investigations", label: "Investigations", icon: <TestTube2 size={15} /> },
  { to: "/patients", label: "Patients", icon: <UserPlus size={15} /> },
  { to: "/users", label: "Users", icon: <Users size={15} /> },
  { to: "/settings", label: "Settings", icon: <Settings size={15} /> },
];

export default function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.session?.user);
  const logout = useAuthStore((s) => s.logout);
  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const navigate = useNavigate();
  const isDark = (settings?.theme ?? "dark") === "dark";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={clsx("shell", collapsed && "shell--collapsed")}>
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <FlaskConical size={15} />
          </div>
          {!collapsed && (
            <span className="sidebar__brand-name truncate">
              {settings?.lab_name ?? "LMS"}
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Nav */}
        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx("nav-item", isActive && "nav-item--active")
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-item__icon">{item.icon}</span>
              {!collapsed && (
                <span className="nav-item__label">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        {/* Footer */}
        <div className="sidebar__footer">
          {/* Theme toggle */}
          <button
            className="sidebar__foot-btn"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && <span>{isDark ? "Light" : "Dark"}</span>}
          </button>

          {/* User */}
          {user && (
            <div className="sidebar__user">
              <div className="sidebar__avatar">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="sidebar__user-info">
                  <span className="sidebar__user-name truncate">
                    {user.full_name}
                  </span>
                  <span className="sidebar__user-role">{user.role}</span>
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button
            className="sidebar__foot-btn sidebar__foot-btn--danger"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
