export const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "EGP", label: "EGP — Egyptian Pound" },
];

export const DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];

export const BACKUP_INTERVALS = [
  { value: "6", label: "Every 6 hours" },
  { value: "12", label: "Every 12 hours" },
  { value: "24", label: "Every 24 hours (daily)" },
  { value: "72", label: "Every 3 days" },
  { value: "168", label: "Every 7 days (weekly)" },
];

export interface BackupFileInfo {
  filename: string;
  path: string;
  size: number;
}
