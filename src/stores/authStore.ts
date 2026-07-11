import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "technician" | "receptionist" | "readonly";
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  user: User;
  expires_at: string;
}

interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await invoke<ApiResult<Session>>("cmd_login", { username, password });
          if (!res.ok || !res.data) throw new Error(res.error ?? "Login failed");
          set({ session: res.data, isLoading: false });
        } catch (e: any) {
          set({ isLoading: false, error: e.message });
          throw e;
        }
      },

      logout: async () => {
        const { session } = get();
        if (session) {
          try {
            await invoke("cmd_logout", {
              sessionId: session.id,
              userId: session.user_id,
            });
          } catch { }
        }
        set({ session: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "lms-auth",
      partialize: (s) => ({ session: s.session }),
    }
  )
);
