# Honour the currency and date format settings

- STATUS: OPEN
- PRIORITY: 45
- TAGS: feature,ui

Settings saves `currency` and `date_format`, but nothing reads them: money() in src/lib/format.ts hardcodes "$" and dateOnly() always returns YYYY-MM-DD. Read both from useSettingsStore (Intl.NumberFormat with the currency code; a small date formatter) and check the print pages and receipts too.
