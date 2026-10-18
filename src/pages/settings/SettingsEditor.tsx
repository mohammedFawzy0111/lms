import { useState } from "react";
import { Save } from "lucide-react";
import { Notice } from "../../components/ui/Notice";
import { Page } from "../../components/ui/Page";
import { errMsg } from "../../lib/api";
import { useSettingsStore, type LabSettings } from "../../stores/settingsStore";
import { AppearanceCard } from "./AppearanceCard";
import { BackupCard } from "./BackupCard";
import { LabInfoCard } from "./LabInfoCard";
import { RegionalCard } from "./RegionalCard";
import type { SettingsForm } from "./types";
import { useFlash } from "./useFlash";

function fromSettings(s: LabSettings): SettingsForm {
  return {
    lab_name: s.lab_name ?? "",
    lab_address: s.lab_address ?? "",
    lab_phone: s.lab_phone ?? "",
    lab_email: s.lab_email ?? "",
    currency: s.currency ?? "USD",
    date_format: s.date_format ?? "YYYY-MM-DD",
  };
}

/**
 * The form is seeded from the stored settings once. It must NOT re-sync on every
 * store change, or switching the theme would wipe unsaved edits in the fields.
 */
export function SettingsEditor({ settings }: { settings: LabSettings }) {
  const update = useSettingsStore((s) => s.update);
  const [form, setForm] = useState<SettingsForm>(() => fromSettings(settings));
  const [saving, setSaving] = useState(false);
  const { flash, show, clear } = useFlash();

  function set<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    clear();
    setSaving(true);
    try {
      const saved = fromSettings(settings);
      const changed = (Object.keys(form) as (keyof SettingsForm)[]).filter((k) => form[k] !== saved[k]);
      await Promise.all(changed.map((k) => update(k, form[k])));
      show("success", changed.length ? "Settings saved successfully" : "No changes to save");
    } catch (e) {
      show("error", errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page
      title="Settings"
      subtitle="Configure laboratory information and preferences"
      actionBtn={
        <button className="save-btn" onClick={save} disabled={saving}>
          <Save size={13} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      }
    >
      {flash && <Notice tone={flash.type}>{flash.text}</Notice>}

      <div className="settings-body">
        <LabInfoCard form={form} onChange={set} />
        <AppearanceCard />
        <RegionalCard form={form} onChange={set} />
        <BackupCard settings={settings} />
      </div>
    </Page>
  );
}
