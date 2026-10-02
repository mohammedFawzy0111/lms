import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export interface LabSettings {
  lab_name: string;
  lab_address: string;
  lab_phone: string;
  lab_email: string;
  theme: string;
  currency: string;
  date_format: string;
  backup_dir: string;
  backup_auto: string;
  backup_interval: string;
}

interface SettingsState {
  settings: LabSettings | null;
  isLoading: boolean;
  load: () => Promise<void>;
  update: (key: string, value: string) => Promise<void>;
  setTheme: (theme: "dark" | "light") => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: null,
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const res = await invoke<ApiResult<LabSettings>>("cmd_get_settings");
      if (res.ok && res.data) {
        set({ settings: res.data });
        applyTheme(res.data.theme);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  update: async (key, value) => {
    await invoke("cmd_set_setting", { key, value });
    const prev = get().settings;
    if (prev) {
      const next = { ...prev, [key]: value };
      set({ settings: next });
      if (key === "theme") applyTheme(value);
    }
  },

  setTheme: (theme) => {
    applyTheme(theme);
    get().update("theme", theme);
  },
}));

function applyTheme(theme: string) {
  document.documentElement.setAttribute(
    "data-theme",
    theme === "light" ? "light" : "dark"
  );
}
