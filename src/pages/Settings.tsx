import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import "./styles/Dashboard.css";
import "./styles/Settings.css";

export default function Settings() {
  const { settings, update, setTheme } = useSettingsStore();
  const [form, setForm] = useState({
    lab_name: "",
    lab_address: "",
    lab_phone: "",
    lab_email: "",
    currency: "USD",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        lab_name: settings.lab_name ?? "",
        lab_address: settings.lab_address ?? "",
        lab_phone: settings.lab_phone ?? "",
        lab_email: settings.lab_email ?? "",
        currency: settings.currency ?? "USD",
      });
    }
  }, [settings]);

  async function save() {
    await Promise.all(
      Object.entries(form).map(([k, v]) => update(k, v))
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Configure your laboratory</p>
        </div>
        <button className="save-btn" onClick={save}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </header>

      <div className="settings-body">
        <div className="settings-section">
          <h2 className="settings-section__title">Laboratory Info</h2>
          <div className="settings-grid">
            {([
              ["lab_name", "Lab Name", "text", "My Laboratory"],
              ["lab_address", "Address", "text", "123 Medical St"],
              ["lab_phone", "Phone", "tel", "+1 555 000 0000"],
              ["lab_email", "Email", "email", "lab@example.com"],
            ] as const).map(([key, label, type, placeholder]) => (
              <div className="field" key={key}>
                <label className="field__label">{label}</label>
                <input
                  className="field__input"
                  type={type}
                  value={form[key as keyof typeof form]}
                  placeholder={placeholder}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section__title">Appearance</h2>
          <div className="theme-toggle">
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                className={`theme-btn ${(settings?.theme ?? "dark") === t ? "theme-btn--active" : ""}`}
                onClick={() => setTheme(t)}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
