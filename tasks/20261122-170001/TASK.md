# Release build does not compile: WIPE_ON_START only exists in debug

- STATUS: OPEN
- PRIORITY: 98
- TAGS: release,db

`cargo build --release` fails with E0425 "cannot find value WIPE_ON_START": db.rs defines the constant under #[cfg(debug_assertions)] but `if WIPE_ON_START` in open_and_migrate() is not gated. No release build has been possible since that change, so nothing else about release builds has been verified either.

1. Remove the const and use `let wipe = cfg!(debug_assertions) && std::env::var_os("LMS_KEEP_DB").is_none();` so the comment's LMS_KEEP_DB=1 escape hatch really works (it is documented but not implemented today).
2. Run `pnpm tauri build` once (or at least `cargo build --release` in src-tauri) and fix whatever else shows up: panic=abort, lto, resource path for seed/*.csv in a bundled app (lib.rs picks the path with cfg!(debug_assertions)), the devseed module being compiled out.
3. Install the built package on a clean machine/user and check: database is created and persists across restarts, investigations are imported, login works.
