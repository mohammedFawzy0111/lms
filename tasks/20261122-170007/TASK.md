# Log to a file and show version/paths in the app

- STATUS: OPEN
- PRIORITY: 70
- TAGS: diagnostics,release

Alpha testers cannot send you a terminal. lib.rs logs to stderr at `debug` level by default, which also means every release build is chatty.

1. Default to `info` in release builds, `debug` only in debug builds or when RUST_LOG is set.
2. Write logs to a rolling file in the app data dir (tracing-appender or a simple file writer), keep the last few days.
3. Settings: an About card with app version, database path, log folder and a button that opens the folder.
4. Make sure panics end up in the log too (panic hook), since release builds use panic=abort.
