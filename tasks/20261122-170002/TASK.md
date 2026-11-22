# Automatic backup never runs: table name typo `lab_sittings`

- STATUS: OPEN
- PRIORITY: 96
- TAGS: bug,backup

lib.rs (startup auto-backup, ~lines 76-100) queries `lab_sittings` four times (backup_auto, backup_dir, backup_interval, last_backup_at). The table is `lab_settings`. Every query fails, `.ok().flatten().unwrap_or_default()` hides the error, so backup_auto is always "" and automatic backups silently never happen, even when the user switched them on in Settings.

1. Fix the four table names.
2. Stop swallowing the errors: log a warning when the settings query fails.
3. last_backup_at is stored with datetime('now') (UTC) and compared with Utc::now(): fine, keep it that way.
4. Also consider running the check on app exit or every few hours while the app is open, not only at startup (a lab PC that stays on for days never restarts).
5. Check: turn auto backup on with a 1 hour interval, set last_backup_at to 2 hours ago in the db, restart, a file must appear in the backup folder.
