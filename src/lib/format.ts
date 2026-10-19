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
 * "just now", "5m ago", "3h ago", then a date. SQLite's datetime('now') is UTC without a
 * zone marker, so it is parsed as UTC; otherwise "just now" would read as hours ago for
 * anyone east of Greenwich.
 */
export function timeAgo(ts: string): string {
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T");
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (isNaN(d.getTime())) return ts;
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString();
}
