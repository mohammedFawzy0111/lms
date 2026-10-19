import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "../../lib/api";
import { ACTIVITY_LIMIT, PENDING_FETCH_LIMIT } from "./constants";
import type { DashboardStats, PendingResultEntry, RecentActivityEntry } from "./types";

const REFRESH_MS = 60_000;

/**
 * Loads the three dashboard feeds independently (one failing doesn't blank the others)
 * and refreshes every minute while the window is visible.
 */
export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivityEntry[]>([]);
  const [pending, setPending] = useState<PendingResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, a, p] = await Promise.allSettled([
      api<DashboardStats>("cmd_get_dashboard_stats"),
      api<RecentActivityEntry[]>("cmd_get_recent_activity", { limit: ACTIVITY_LIMIT }),
      api<PendingResultEntry[]>("cmd_get_pending_results", { limit: PENDING_FETCH_LIMIT }),
    ]);
    if (s.status === "fulfilled") setStats(s.value);
    if (a.status === "fulfilled") setActivity(a.value);
    if (p.status === "fulfilled") setPending(p.value);
    const failed = [s, a, p].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    setError(failed ? errMsg(failed.reason) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return { stats, activity, pending, loading, error };
}
