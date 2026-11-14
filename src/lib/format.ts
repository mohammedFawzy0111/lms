/** Regional settings (lab settings: currency + date format). Set by the settings store. */
let regional: { currency: string; dateFormat: string } = {
  currency: "EGP",
  dateFormat: "YYYY-MM-DD",
};

export function setRegional(r: { currency?: string; dateFormat?: string }) {
  regional = {
    currency: r.currency || regional.currency,
    dateFormat: r.dateFormat || regional.dateFormat,
  };
}

const moneyFormaters = new Map<string, Intl.NumberFormat>();

/** 1234.5 -> "EGP 1,234.50" / "$1,234.50" depending on the currency setting. */
export function money(n: number): string {
  const code = regional.currency;
  let fmt = moneyFormaters.get(code);

  if (!fmt) {
    try {
      fmt = Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // Unknown currency code: fall back to a plain number with the code in front.
      return `${code} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    moneyFormaters.set(code, fmt);
  }

  return fmt.format(n);
}

function layoutDate(y: string, m: string, d: string): string {
  switch (regional.dateFormat) {
    case "DD/MM/YYYY":
      return `${d}/${m}/${y}`;
    case "MM/DD/YYYY":
      return `${m}/${d}/${y}`;
    default:
      return `${y}-${m}-${d}`;
  }
}

/** "2026-10-17" or "2026-10-17 14:05:00" -> the configured format; null/empty -> "—". No time-zone shift. */
export function dateOnly(s: string | null | undefined): string {
  if (!s) return "—";
  const [y, m, d] = s.split(/[ T]/)[0].split("-");
  return y && m && d ? layoutDate(y, m, d) : s;
}

/** A Date in the user's local time as the configured date format. */
export function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return layoutDate(
    String(d.getFullYear()),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
  );
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
  return formatDate(d);
}

/** A stored UTC timestamp as local date (configured format) plus 24h time: "19/10/2026 13:05". */
export function formatDateTime(ts: string): string {
  const d = parseUtc(ts);
  if (isNaN(d.getTime())) return ts;
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(d)} ${time}`;
}
