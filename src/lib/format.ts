/** One place to change the currency display later (e.g. from lab settings). */
export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** "2026-10-17 14:05:00" -> "2026-10-17"; null/empty -> "—". */
export function dateOnly(s: string | null | undefined): string {
  return s ? s.split(" ")[0] : "—";
}
