import { useCallback, useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Database, HardDrive, RotateCcw } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/CustomTable";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { api, errMsg } from "../../lib/api";
import { fileSize } from "../../lib/format";
import { useSettingsStore, type LabSettings } from "../../stores/settingsStore";
import { BACKUP_INTERVALS, type BackupFileInfo } from "./constants";
import { useFlash } from "./useFlash";

/** Mounted only once settings exist, so initial state can be read from them directly. */
export function BackupCard({ settings }: { settings: LabSettings }) {
  const update = useSettingsStore((s) => s.update);
  const { flash, show, clear } = useFlash(2500);

  const [backupDir, setBackupDir] = useState(settings.backup_dir ?? "");
  const [autoEnabled, setAutoEnabled] = useState(settings.backup_auto === "1");
  const [every, setEvery] = useState(settings.backup_interval ?? "24");
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const loadBackups = useCallback(async () => {
    if (!backupDir) return setBackups([]);
    try {
      setBackups(await api<BackupFileInfo[]>("cmd_list_backups", { dir: backupDir }));
    } catch (e) {
      show("error", errMsg(e));
    }
  }, [backupDir, show]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  async function pickBackupDir() {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (typeof selected !== "string") return;
      await update("backup_dir", selected);
      setBackupDir(selected); // the effect above refreshes the list
    } catch (e) {
      show("error", errMsg(e));
    }
  }

  async function saveAutoSettings() {
    try {
      await update("backup_auto", autoEnabled ? "1" : "0");
      await update("backup_interval", every);
      show("success", "Auto-backup settings saved");
    } catch (e) {
      show("error", errMsg(e));
    }
  }

  async function backupNow() {
    setBusy(true);
    clear();
    try {
      await api<string>("cmd_backup_now", { destDir: backupDir });
      show("success", "Backup created successfully");
      await loadBackups();
    } catch (e) {
      show("error", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(path: string) {
    const ok = confirm(
      "Restore this backup? Your current database will be safety-copied first, but this will replace all current data with the backup's data. Restart the application after this completes.",
    );
    if (!ok) return;
    setBusy(true);
    clear();
    try {
      await api<boolean>("cmd_restore_backup", { backupPath: path });
      show("success", "Restore complete. Please restart the application now.");
    } catch (e) {
      show("error", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Backup & Restore" icon={<HardDrive size={14} />}>
      <div className="stack">
        {flash && <Notice tone={flash.type}>{flash.text}</Notice>}

        <Field label="Backup Folder">
          <div className="field--row">
            <input className="field__input grow" value={backupDir} readOnly placeholder="No folder selected" />
            <button className="action-btn" onClick={pickBackupDir}>Choose Folder</button>
          </div>
        </Field>

        <div className="form-grid">
          <Field label="Automatic Backups">
            <select
              className="field__input"
              value={autoEnabled ? "1" : "0"}
              onChange={(e) => setAutoEnabled(e.target.value === "1")}
            >
              <option value="0">Disabled</option>
              <option value="1">Enabled</option>
            </select>
          </Field>
          <Field label="Backup Frequency">
            <select
              className="field__input"
              value={every}
              disabled={!autoEnabled}
              onChange={(e) => setEvery(e.target.value)}
            >
              {BACKUP_INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <button className="action-btn" onClick={saveAutoSettings}>Save Auto-Backup Settings</button>
        </div>

        <div className="field--row">
          <button className="save-btn" onClick={backupNow} disabled={busy || !backupDir}>
            <Database size={13} />
            {busy ? "Working..." : "Backup Now"}
          </button>
          <button className="action-btn" onClick={loadBackups} disabled={!backupDir || busy}>
            <RotateCcw size={13} />
            Refresh List
          </button>
        </div>

        {backups.length > 0 && (
          <DataTable
            wrapperClassName="backup-list"
            rows={backups}
            getRowKey={(b) => b.path}
            columns={[
              { key: "filename", header: "File", cell: (b) => <span className="font-mono cell-muted">{b.filename}</span> },
              { key: "size", header: "Size", cell: (b) => <span className="cell-muted nowrap">{fileSize(b.size)}</span> },
              {
                key: "actions",
                header: "Actions",
                cell: (b) => (
                  <button className="action-btn" disabled={busy} onClick={() => restoreBackup(b.path)}>
                    Restore
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
