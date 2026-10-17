use anyhow::{anyhow, Result};
use chrono::Local;
use rusqlite::{backup::Backup, Connection};
use std::path::Path;
use std::time::Duration;

/// Perform a live, crash-safe backup of the database to `dest_path`.
/// Uses SQLite's online backup API - safe to run while the app is using the DB.
pub fn backup_to_file(conn: &Connection, dest_path: &Path) -> Result<()> {
    let mut dest_conn =
        Connection::open(dest_path).map_err(|e| anyhow!("Failed to create backup file: {}", e))?;

    let backup =
        Backup::new(conn, &mut dest_conn).map_err(|e| anyhow!("Failed to start backup: {}", e))?;

    backup
        .run_to_completion(5, Duration::from_millis(50), None)
        .map_err(|e| anyhow!("backup Failed: {}", e))?;

    Ok(())
}

/// Generate a timestamped backup filename.
pub fn generate_backup_filename() -> String {
    let now = Local::now();
    format!("lms-backup-{}.db", now.format("%Y%m%d-%H%M%S"))
}

/// Verify a backupfile is a valid non-corrupt SQLite database.
pub fn verify_backup(path: &Path) -> Result<bool> {
    let conn = Connection::open(path).map_err(|e| anyhow!("Cannont open backup file: {}", e))?;

    let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;

    let has_users_table: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    Ok(result == "ok" && has_users_table)
}

/// Restore from a backup file: verify it first, then copy it over the live DB.
/// The caller is responsible for closing/reopening the live connection around this.
pub fn restore_from_file(
    backup_path: &Path,
    live_db_path: &Path,
    safety_copy_path: &Path,
) -> Result<()> {
    if !verify_backup(backup_path)? {
        return Err(anyhow!("Backup file failed integrity check — restore aborted"));
    }

    // Make a safety copy of the current live DB before overwriting
    std::fs::copy(live_db_path, safety_copy_path)
        .map_err(|e| anyhow!("Failed to create safety copy before restore: {}", e))?;

    std::fs::copy(backup_path, live_db_path)
        .map_err(|e| anyhow!("Failed to restore backup: {}", e))?;

    Ok(())
}

/// Get list of backup files in a directory, sorted newest first.
pub fn list_backups(dir: &Path) -> Result<Vec<(String, String, u64)>> {
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut backups = Vec::new();
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("db") {
            let metadata = entry.metadata()?;
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            backups.push((filename, path.to_string_lossy().to_string(), metadata.len()));
        }
    }

    // Sort newest first by filename (timestamp is embedded in the name , so string sort works)
    backups.sort_by(|a, b| b.0.cmp(&a.0));
    Ok(backups)
}
