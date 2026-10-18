/** One place to change the currency display later (e.g. from lab settings). */
export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
