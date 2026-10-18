import { invoke } from "@tauri-apps/api/core";

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
export async function api<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const res = await invoke<ApiResult<T>>(cmd, args);
  if (!res.ok) throw new Error(res.error ?? "Request failed");
  return res.data as T;
}

/** Tauri rejects with plain strings, other code throws Errors; handle both. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
