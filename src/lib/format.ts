/** One place to change the currency display later (e.g. from lab settings). */
export function money(n: number): string {
  return `$${n.toFixed(2)}`;
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
