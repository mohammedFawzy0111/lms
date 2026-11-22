import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../stores/authStore";

/** Shape every Rust `cmd_*` command returns. */
export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Call a command that returns `ApiResult<T>`. Resolves with `data`; throws an
 * Error carrying the backend's message when `ok` is false, so callers only
 * need one try/catch and can't silently ignore a failed command.
 */
export async function api<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  const sessionId = useAuthStore.getState().session?.id ?? "";
  const res = await invoke<ApiResult<T>>(cmd, { sessionId, ...args });
  if (!res.ok) {
    // The session died on the backend: go back to Login.
    if (res.error?.startsWith("Session expired")) useAuthStore.setState({ session: null });
    throw new Error(res.error ?? "Request failed");
  }
  return res.data as T;
}
/** Tauri rejects with plain strings, other code throws Errors; handle both. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
