import { useState, ChangeEvent } from "react";
import { Eye, EyeOff, FlaskConical, AlertCircle, LogIn } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  async function handleSubmit(e: ChangeEvent) {
    e.preventDefault();
    clearError();
    if (!username.trim() || !password) return;
    try { await login(username.trim(), password); } catch { }
  }

  return (
    <div className="login-shell">
      <div className="login-bg">
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__grid" />
      </div>

      <div className="login-card anim-fade-in">
        <div className="login-card__brand">
          <div className="login-card__logo">
            <FlaskConical size={24} />
          </div>
          <div>
            <h1 className="login-card__title">Laboratory Management</h1>
            <p className="login-card__sub">Sign in to continue</p>
          </div>
        </div>

        <form className="login-card__form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Username</label>
            <input
              className="field__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label className="field__label">Password</label>
            <div className="field__wrap">
              <input
                className="field__input"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="field__eye"
                onClick={() => setShowPass((p) => !p)}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading || !username.trim() || !password}
          >
            {isLoading ? (
              <span className="anim-spin" style={{ display: "inline-flex" }}>
                ◌
              </span>
            ) : (
              <LogIn size={14} />
            )}
            <span>{isLoading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        <p className="login-card__hint">
          Default: <span className="font-mono">admin / admin</span>
        </p>
      </div>
    </div>
  );
}
