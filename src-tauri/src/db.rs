use anyhow::{Context, Result};
use rusqlite::Connection;
use std::path::Path;

#[cfg(debug_assertions)]
const WIPE_ON_START: bool = true;

/// Baseline schema (version 1). Edit freely during development; freeze it at release.
const SCHEMA: &str = include_str!("schema.sql");
const BASELINE: u32 = 1;

/// Post-release changes. Append only, never edit or reorder released entries.
/// Example:
///     (2, include_str!("migrations/0002_add_lab_logo.sql")),
const MIGRATIONS: &[(u32, &str)] = &[];

pub fn open_and_migrate(path: &Path) -> Result<Connection> {
    // Dev builds start from a clean database so schema.sql is always what runs.
    // Set LMS_KEEP_DB=1 to keep your data between restarts.
    if WIPE_ON_START {
        reset_db_files(path)?;
        eprintln!("[db] debug build: wiped {:?}", path);
    }

    let conn =
        Connection::open(path).with_context(|| format!("Failed to open database at {:?}", path))?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous  = NORMAL;
        PRAGMA cache_size   = -32000;
        PRAGMA temp_store   = MEMORY;
        PRAGMA busy_timeout = 5000;
    ",
    )?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ",
    )?;

    let mut version: u32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )?;

    // Fresh database: apply the baseline schema atomically with its version row.
    if version == 0 {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(SCHEMA)
            .context("Failed to apply schema.sql")?;
        tx.execute(
            "INSERT INTO schema_migrations (version) VALUES (?1)",
            [BASELINE],
        )?;
        tx.commit()?;
        version = BASELINE;
    }

    // Incremental migrations, each atomic with its version row.
    for &(v, sql) in MIGRATIONS.iter().filter(|m| m.0 > version) {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)
            .with_context(|| format!("Migration {v} failed"))?;
        tx.execute("INSERT INTO schema_migrations (version) VALUES (?1)", [v])?;
        tx.commit()?;
    }

    Ok(conn)
}

/// Delete the DB plus its WAL sidecar files so no stale data gets replayed.
fn reset_db_files(path: &Path) -> Result<()> {
    for suffix in ["", "-wal", "-shm"] {
        let mut p = path.as_os_str().to_owned();
        p.push(suffix);
        match std::fs::remove_file(&p) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.into()),
        }
    }
    Ok(())
}

#[allow(dead_code)]
pub fn integrity_check(conn: &Connection) -> bool {
    conn.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map(|r| r == "ok")
        .unwrap_or(false)
}
