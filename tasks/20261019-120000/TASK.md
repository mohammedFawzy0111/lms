# Fix dashboard stat queries (completed today, day boundary)

- STATUS: CLOSED
- PRIORITY: 60
- TAGS: bug,backend

src-tauri/src/commands.rs cmd_get_dashboard_stats:
1. completed_today counts items with status 'completed' whose created_at is today, i.e. tests ORDERED today that are done, not tests COMPLETED today. A test ordered yesterday and finished today is missed. Use a completion timestamp (results.updated_at where is_draft = 0, or add completed_at to lab_request_items).
2. date('now') is UTC, so "today" rolls over at 03:00 local time in Cairo. Use date('now','localtime') for the day comparisons, or compute the local day range in Rust.
3. The struct field is pending_investigation (singular); the old dashboard read pending_investigations (plural) so that tile always showed a dash. The new frontend matches the Rust name; keep them in sync if either is renamed.
