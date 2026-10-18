# Verify debug-only DB wipe and release keeps data

- STATUS: CLOSED
- PRIORITY: 75
- TAGS: db

Confirm WIPE_ON_START with #[cfg(debug_assertions)] is in db.rs. Test: build with tauri build, create a patient, restart, confirm it persists and the wipe log line never prints. Remember tauri build --debug still wipes.
