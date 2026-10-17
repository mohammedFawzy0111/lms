import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Save,
  Building2,
  Sun,
  Moon,
  Database,
  CheckCircle,
  HardDrive,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import "./styles/Settings.css";
import { Page } from "../components/ui/Page";

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export default function SettingsPage() {
  const { settings, load, update } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    lab_name: "",
    lab_address: "",
    lab_phone: "",
    lab_email: "",
    currency: "USD",
    date_format: "YYYY-MM-DD",
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (settings) {
      setForm({
        lab_name: settings.lab_name ?? "",
        lab_address: settings.lab_address ?? "",
        lab_phone: settings.lab_phone ?? "",
        lab_email: settings.lab_email ?? "",
        currency: settings.currency ?? "USD",
        date_format: settings.date_format ?? "YYYY-MM-DD",
      });
    }
  }, [settings]);

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setError(null);
    try {
      await Promise.all(
        (Object.entries(form) as [keyof typeof form, string][]).map(([k, v]) =>
          update(k as any, v),
        ),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const isDark = settings?.theme === "dark";

  return (
    <Page
      title="Settings"
      subtitle="Configure laboratory information and preferences"
      actionBtn={
        <button className="save-btn" onClick={save}>
          <Save size={13} style={{ marginRight: 6 }} />
          Save Changes
        </button>
      }
    >
      {saved && (
        <div
          className="error"
          style={{
            background: "var(--success-dim)",
            borderColor: "var(--success)",
            color: "var(--success)",
          }}
        >
          <CheckCircle size={13} style={{ marginRight: 6 }} />
          Settings saved successfully
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-5)",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {/* Lab Info */}
        <div className="card" style={{ padding: "var(--sp-5)" }}>
          <div className="card__header">
            <Building2
              size={14}
              style={{ marginRight: 8, color: "var(--accent)" }}
            />
            Laboratory Information
          </div>
          <div className="form-grid">
            <div className="field field--full">
              <label className="field__label">Laboratory Name</label>
              <input
                className="field__input"
                value={form.lab_name}
                onChange={(e) => set("lab_name", e.target.value)}
                placeholder="My Laboratory"
              />
            </div>
            <div className="field field--full">
              <label className="field__label">Address</label>
              <input
                className="field__input"
                value={form.lab_address}
                onChange={(e) => set("lab_address", e.target.value)}
                placeholder="123 Medical St"
              />
            </div>
            <div className="field">
              <label className="field__label">Phone</label>
              <input
                className="field__input"
                value={form.lab_phone}
                onChange={(e) => set("lab_phone", e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="field">
              <label className="field__label">Email</label>
              <input
                className="field__input"
                type="email"
                value={form.lab_email}
                onChange={(e) => set("lab_email", e.target.value)}
                placeholder="lab@example.com"
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card" style={{ padding: "var(--sp-5)" }}>
          <div className="card__header">
            {isDark ? (
              <Moon
                size={14}
                style={{ marginRight: 8, color: "var(--accent)" }}
              />
            ) : (
              <Sun
                size={14}
                style={{ marginRight: 8, color: "var(--warning)" }}
              />
            )}
            Appearance
          </div>
          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <ThemeCard
              title="Dark"
              active={isDark}
              onClick={() => useSettingsStore.getState().setTheme("dark")}
              preview="dark"
            />
            <ThemeCard
              title="Light"
              active={!isDark}
              onClick={() => useSettingsStore.getState().setTheme("light")}
              preview="light"
            />
          </div>
        </div>

        {/* Regional */}
        <div className="card" style={{ padding: "var(--sp-5)" }}>
          <div className="card__header">
            <Database
              size={14}
              style={{ marginRight: 8, color: "var(--accent)" }}
            />
            Regional Settings
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field__label">Currency</label>
              <select
                className="field__input"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="SAR">SAR — Saudi Riyal</option>
                <option value="EGP">EGP — Egyptian Pound</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label">Date Format</label>
              <select
                className="field__input"
                value={form.date_format}
                onChange={(e) => set("date_format", e.target.value)}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </div>

        <BackupSettingsCard />
      </div>
    </Page>
  );
}

function ThemeCard({
  title,
  active,
  onClick,
  preview,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  preview: "dark" | "light";
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 120,
        borderRadius: "var(--r-lg)",
        border: active ? "2px solid var(--accent)" : "2px solid var(--border)",
        overflow: "hidden",
        cursor: "pointer",
        background: "none",
        padding: 0,
        transition: "border-color var(--t-fast)",
      }}
    >
      <div
        style={{
          height: 68,
          background: preview === "dark" ? "#111a2e" : "#f0f4f8",
          display: "flex",
          alignItems: "flex-end",
          padding: "8px",
          gap: "4px",
        }}
      >
        {[40, 60, 45, 55].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: h + "%",
              borderRadius: "3px 3px 0 0",
              background:
                preview === "dark"
                  ? "rgba(99,202,255,0.3)"
                  : "rgba(0,102,204,0.2)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          padding: "6px 8px",
          fontSize: 12,
          fontWeight: active ? 600 : 400,
          color: active ? "var(--accent)" : "var(--text-secondary)",
          background: "var(--bg-surface)",
          textAlign: "left",
        }}
      >
        {title} {active && "✓"}
      </div>
    </button>
  );
}

// ── Backup & Restore ──────────────────────────────────────────────────────────

interface BackupFileInfo {
  filename: string;
  path: string;
  size: number;
}

function BackupSettingsCard() {
  const { settings, update } = useSettingsStore();
  const [backupDir, setBackupDir] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [interval, setInterval_] = useState("24");
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      setBackupDir(settings.backup_dir ?? "");
      setAutoEnabled(settings.backup_auto === "1");
      setInterval_(settings.backup_interval ?? "24");
    }
  }, [settings]);

  async function pickBackupDir() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setBackupDir(selected);
      await update("backup_dir", selected);
      loadBackups(selected);
    }
  }

  async function saveAutoSettings() {
    await update("backup_auto", autoEnabled ? "1" : "0");
    await update("backup_interval", interval);
    setMessage({ type: "success", text: "Auto-backup settings saved" });
    setTimeout(() => setMessage(null), 2500);
  }

  async function loadBackups(dir?: string) {
    const targetDir = dir ?? backupDir;
    if (!targetDir) return;
    const res = await invoke<ApiResult<BackupFileInfo[]>>("cmd_list_backups", {
      dir: targetDir,
    });
    if (res.ok && res.data) setBackups(res.data);
  }

  useEffect(() => {
    if (backupDir) loadBackups();
  }, [backupDir]);

  async function backupNow() {
    if (!backupDir) {
      setMessage({ type: "error", text: "Choose a backup folder first" });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await invoke<ApiResult<string>>("cmd_backup_now", {
        destDir: backupDir,
      });
      if (!res.ok) throw new Error(res.error ?? "Backup failed");
      setMessage({ type: "success", text: "Backup created successfully" });
      loadBackups();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function restoreBackup(path: string) {
    if (
      !confirm(
        "Restore this backup? Your current database will be safety-copied first, but this will replace all current data with the backup's data. Restart the application after this completes.",
      )
    )
      return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await invoke<ApiResult<boolean>>("cmd_restore_backup", {
        backupPath: path,
      });
      if (!res.ok) throw new Error(res.error ?? "Restore failed");
      setMessage({
        type: "success",
        text: "Restore complete. Please restart the application now.",
      });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="card" style={{ padding: "var(--sp-5)" }}>
      <div className="card__header">
        <HardDrive
          size={14}
          style={{ marginRight: 8, color: "var(--accent)" }}
        />
        Backup &amp; Restore
      </div>

      {message && (
        <div
          className="error"
          style={
            message.type === "success"
              ? {
                  background: "var(--success-dim)",
                  borderColor: "var(--success)",
                  color: "var(--success)",
                  marginBottom: 12,
                }
              : { marginBottom: 12 }
          }
        >
          {message.type === "success" ? (
            <CheckCircle2 size={13} style={{ marginRight: 6 }} />
          ) : (
            <XCircle size={13} style={{ marginRight: 6 }} />
          )}
          {message.text}
        </div>
      )}

      <div className="field" style={{ marginBottom: 16 }}>
        <label className="field__label">Backup Folder</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="field__input"
            value={backupDir}
            readOnly
            placeholder="No folder selected"
            style={{ flex: 1 }}
          />
          <button className="action-btn" onClick={pickBackupDir}>
            Choose Folder
          </button>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="field">
          <label className="field__label">Automatic Backups</label>
          <select
            className="field__input"
            value={autoEnabled ? "1" : "0"}
            onChange={(e) => setAutoEnabled(e.target.value === "1")}
          >
            <option value="0">Disabled</option>
            <option value="1">Enabled</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label">Backup Frequency</label>
          <select
            className="field__input"
            value={interval}
            onChange={(e) => setInterval_(e.target.value)}
            disabled={!autoEnabled}
          >
            <option value="6">Every 6 hours</option>
            <option value="12">Every 12 hours</option>
            <option value="24">Every 24 hours (daily)</option>
            <option value="72">Every 3 days</option>
            <option value="168">Every 7 days (weekly)</option>
          </select>
        </div>
      </div>
      <button
        className="action-btn"
        onClick={saveAutoSettings}
        style={{ marginBottom: 20 }}
      >
        Save Auto-Backup Settings
      </button>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className="save-btn"
          onClick={backupNow}
          disabled={loading || !backupDir}
        >
          <Database size={13} style={{ marginRight: 6 }} />
          {loading ? "Working..." : "Backup Now"}
        </button>
        <button
          className="action-btn"
          onClick={() => loadBackups()}
          disabled={!backupDir}
        >
          <RotateCcw size={13} style={{ marginRight: 6 }} />
          Refresh List
        </button>
      </div>

      {backups.length > 0 && (
        <div className="table-wrap" style={{ maxHeight: 260 }}>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.path}>
                  <td className="font-mono" style={{ fontSize: 12 }}>
                    {b.filename}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {formatSize(b.size)}
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      onClick={() => restoreBackup(b.path)}
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
