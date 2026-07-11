use anyhow::{Context, Result};
use rusqlite::Connection;
use std::{path::Path, result};

pub fn open_and_migrate(path: &Path) -> Result<Connection> {
    let conn =
        Connection::open(path).with_context(|| format!("Failed to open database at {:?}", path))?;

    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous  = NORMAL;
        PRAGMA cache_size   = -32000;
        PRAGMA temp_store   = MEMORY;
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

    let version: u32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |row| row.get(0))
        .unwrap_or(0);

    if version < 1 {
        migrate_v1(&conn)?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (1)", [])?;
    }

    if version < 2 {
        migrate_v2(&conn)?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (2)", [])?;
    }

    if version < 3 {
        migrate_v3(&conn)?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (3)", [])?;
    }

    if version < 4 {
        migrate_v4(&conn)?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (4)", [])?;
    }

    if version < 5 {
        migrate_v5(&conn)?;
        conn.execute("INSERT INTO schema_migrations (version) VALUES (5)", [])?;
    }

    Ok(conn)
}

fn migrate_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            full_name     TEXT NOT NULL,
            role          TEXT NOT NULL CHECK (role IN ('admin','technician','receptionist','readonly')),
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            is_active  INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
            action      TEXT NOT NULL,
            entity_type TEXT,
            entity_id   TEXT,
            details     TEXT,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS lab_settings (
            key        TEXT PRIMARY KEY,
            value      TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO lab_settings (key, value) VALUES
            ('lab_name',    'My Laboratory'),
            ('lab_address', ''),
            ('lab_phone',   ''),
            ('lab_email',   ''),
            ('theme',       'dark'),
            ('currency',    'EGP'),
            ('date_format', 'YYYY-MM-DD');
    ")?;

    Ok(())
}

fn migrate_v2(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        patient_no TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT CHECK (gender IN ('male', 'female')),
        phone TEXT,
        address TEXT,
        email TEXT,
        referring_physician TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_no ON patients(patient_no);

    CREATE TABLE IF NOT EXISTS patient_counter (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        value INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO patient_counter(id, value) VALUES (1, 0);
    ",
    )?;

    Ok(())
}

fn migrate_v3(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        ALTER TABLE patients ADD COLUMN age_override INTEGER;
    ",
    )?;
    Ok(())
}

fn migrate_v4(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS investigation_categories (
            id    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name  TEXT NOT NULL UNIQUE
        );

        INSERT OR IGNORE INTO investigation_categories (id, name) VALUES
            (lower(hex(randomblob(16))), 'Hematology'),
            (lower(hex(randomblob(16))), 'Biochemistry'),
            (lower(hex(randomblob(16))), 'Immunology'),
            (lower(hex(randomblob(16))), 'Serology'),
            (lower(hex(randomblob(16))), 'Microbiology'),
            (lower(hex(randomblob(16))), 'Endocrinology'),
            (lower(hex(randomblob(16))), 'Pathology');

        CREATE TABLE IF NOT EXISTS investigations (
            id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            test_code     TEXT NOT NULL UNIQUE,
            test_name     TEXT NOT NULL,
            category_id   TEXT REFERENCES investigation_categories(id) ON DELETE SET NULL,
            description   TEXT,
            unit          TEXT,
            cost          REAL NOT NULL DEFAULT 0,
            result_type   TEXT NOT NULL CHECK (result_type IN ('numeric','text','multi_field')) DEFAULT 'numeric',
            is_active     INTEGER NOT NULL DEFAULT 1,
            critical_low  REAL,
            critical_high REAL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_investigations_code     ON investigations (test_code);
        CREATE INDEX IF NOT EXISTS idx_investigations_category ON investigations (category_id);
        CREATE INDEX IF NOT EXISTS idx_investigations_active   ON investigations (is_active);

        -- Reference ranges: age-group and gender aware
        CREATE TABLE IF NOT EXISTS reference_ranges (
            id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
            age_group       TEXT NOT NULL CHECK (age_group IN ('neonate','infant','child','adolescent','adult','elderly')),
            gender          TEXT CHECK (gender IN ('male','female','any')) DEFAULT 'any',
            min_value       REAL,
            max_value       REAL,
            is_default      INTEGER NOT NULL DEFAULT 1,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_refranges_investigation ON reference_ranges (investigation_id);

        -- Profiles/panels (e.g. CBC, LFT)
        CREATE TABLE IF NOT EXISTS profiles (
            id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name        TEXT NOT NULL UNIQUE,
            description TEXT,
            is_active   INTEGER NOT NULL DEFAULT 1,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS profile_investigations (
            profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
            PRIMARY KEY (profile_id, investigation_id)
        );
    ")?;
    Ok(())
}

fn migrate_v5(conn: &Connection) -> Result<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS lab_requests (
            id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            request_no      TEXT NOT NULL UNIQUE,
            patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','sample_collected','in_progress','completed','delivered','cancelled')),
            priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
            request_date    TEXT NOT NULL DEFAULT (datetime('now')),
            collection_date TEXT,
            due_date        TEXT,
            notes           TEXT,
            created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_requests_patient ON lab_requests (patient_id);
        CREATE INDEX IF NOT EXISTS idx_requests_status  ON lab_requests (status);
        CREATE INDEX IF NOT EXISTS idx_requests_no      ON lab_requests (request_no);
        CREATE INDEX IF NOT EXISTS idx_requests_date    ON lab_requests (request_date);

        CREATE TABLE IF NOT EXISTS lab_request_items (
            id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            request_id       TEXT NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
            investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE RESTRICT,
            status           TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','sample_collected','in_progress','completed','delivered','cancelled')),
            price_at_order   REAL NOT NULL DEFAULT 0,
            created_at       TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_request_items_request ON lab_request_items (request_id);
        CREATE INDEX IF NOT EXISTS idx_request_items_inv     ON lab_request_items (investigation_id);

        CREATE TABLE IF NOT EXISTS request_counter (
            id    INTEGER PRIMARY KEY CHECK (id = 1),
            value INTEGER NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO request_counter (id, value) VALUES (1, 0);
    ")?;
    Ok(())
}

pub fn integrity_check(conn: &Connection) -> bool {
    conn.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map(|r| r == "ok")
        .unwrap_or(false)
}
