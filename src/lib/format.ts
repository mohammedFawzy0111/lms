/** One place to change the currency display later (e.g. from lab settings). */
export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-10-17 14:05:00" -> "2026-10-17"; null/empty -> "—". */
export function dateOnly(s: string | null | undefined): string {
  return s ? s.split(" ")[0] : "—";
}

/** 1536 -> "1.5 KB". */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * SQLite's datetime('now') is UTC without a zone marker. Parse it as UTC so it can be shown
 * in the user's local time (and so "just now" doesn't read as hours ago east of Greenwich).
 */
export function parseUtc(ts: string): Date {
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T");
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

/** "just now", "5m ago", "3h ago", then a date. */
export function timeAgo(ts: string): string {
  const d = parseUtc(ts);
  if (isNaN(d.getTime())) return ts;
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString();
}

/** A stored UTC timestamp as local "19 Oct 2026, 13:05". */
export function formatDateTime(ts: string): string {
  const d = parseUtc(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
