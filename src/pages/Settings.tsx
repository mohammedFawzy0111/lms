import { Page } from "../components/ui/Page";
import { useSettingsStore } from "../stores/settingsStore";
import { SettingsEditor } from "./settings/SettingsEditor";
import "./styles/Settings.css";

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const isLoading = useSettingsStore((s) => s.isLoading);
  const load = useSettingsStore((s) => s.load);

  if (!settings) {
    return (
      <Page title="Settings">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="empty">
            Could not load settings. <button className="action-btn" onClick={load}>Retry</button>
          </div>
        )}
      </Page>
    );
  }

  return <SettingsEditor settings={settings} />;
}
