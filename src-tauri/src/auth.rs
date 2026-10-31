use anyhow::{anyhow, Result};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono;
use rusqlite::params;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub user: User,
    pub expires_at: String,
}

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow!("Hash failed: {}", e))?;
    Ok(hash.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    let parsed = PasswordHash::new(hash).map_err(|e| anyhow!("Invalid hash: {}", e))?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok())
}

pub fn seed_default_admin(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;

    if count == 0 {
        let hash = hash_password("admin")?;
        conn.execute(
            "INSERT INTO users (id, username, password_hash, full_name, role)
             VALUES (?1, 'admin', ?2, 'Administrator', 'admin')",
            params![Uuid::new_v4().to_string(), hash],
        )?;
    }

    Ok(())
}

pub fn login(conn: &Connection, username: &str, password: &str) -> Result<Session> {
    let result: rusqlite::Result<(String, String, String, String, i64, String)> = conn.query_row(
        "SELECT id, username, password_hash, full_name, role, is_active, created_at
         FROM users WHERE username = ?1 COLLATE NOCASE",
        params![username],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, String>(6)?,
            ))
        },
    );

    let (id, hash, full_name, role, is_active, created_at) = match result {
        Ok(r) => r,
        Err(_) => return Err(anyhow!("Invalid username or password")),
    };

    if is_active == 0 {
        return Err(anyhow!("Account is disabled"));
    }

    if !verify_password(password, &hash)? {
        return Err(anyhow!("Invalid username or password"));
    }

    let session_id = Uuid::new_v4().to_string();
    let expires_at = "2099-01-01 00:00:00".to_string();

    conn.execute(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)",
        params![session_id, id, expires_at],
    )?;

    // Write audit log
    let _ =
        conn.execute("INSERT INTO audit_log (user_id, action) VALUES (?1, 'login')", params![id]);

    Ok(Session {
        id: session_id,
        user_id: id.clone(),
        user: User {
            id,
            username: username.to_string(),
            full_name,
            role,
            is_active: true,
            created_at,
        },
        expires_at,
    })
}

pub fn logout(conn: &Connection, session_id: &str, user_id: &str) -> Result<()> {
    conn.execute("UPDATE sessions SET is_active = 0 WHERE id = ?1", params![session_id])?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action) VALUES (?1, 'logout')",
        params![user_id],
    );

    Ok(())
}

pub fn create_user(
    conn: &Connection,
    username: &str,
    password: &str,
    full_name: &str,
    role: &str,
    actor_id: &str,
) -> Result<User> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE username = ?1 COLLATE NOCASE",
        params![username],
        |r| r.get(0),
    )?;

    if exists > 0 {
        return Err(anyhow!("username already exists"));
    }

    let id = Uuid::new_v4().to_string();
    let hash = hash_password(password)?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, full_name, role)
        VALUES (?1,?2,?3,?4,?5)",
        params![id, username, hash, full_name, role],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
        Values (?1, 'user_created', 'user', ?2)",
        params![actor_id, id],
    )?;

    Ok(User {
        id,
        username: username.to_string(),
        full_name: full_name.to_string(),
        role: role.to_string(),
        is_active: true,
        created_at: now,
    })
}

pub fn list_users(conn: &Connection) -> Result<Vec<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, username, full_name, role, is_active, created_at
        FROM users ORDER BY created_at ASC",
    )?;

    let users: Vec<User> = stmt
        .query_map([], |row| -> rusqlite::Result<User> {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                full_name: row.get(2)?,
                role: row.get(3)?,
                is_active: row.get::<_, i64>(4)? != 0,
                created_at: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(users)
}

pub fn set_user_active(
    conn: &Connection,
    target_id: &str,
    active: bool,
    actor_id: &str,
) -> Result<()> {
    conn.execute(
        "UPDATE users SET is_active = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![active as i64, target_id],
    )?;

    let action = if active {
        "user_activated"
    } else {
        "user_deactivated"
    };
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
        VALUES (?1, ?2, 'user', ?3)",
        params![actor_id, action, target_id],
    );
    Ok(())
}

pub fn reset_password(
    conn: &Connection,
    user_id: &str,
    actor_id: &str,
    new_password: &str,
) -> Result<()> {
    let actor_role: String =
        conn.query_row("SELECT role FROM users WHERE id = ?1", params![actor_id], |r| r.get(0))?;
    let user_role: String =
        conn.query_row("SELECT role FROM users WHERE id = ?1", params![user_id], |r| r.get(0))?;

    if actor_role != "admin" {
        return Err(anyhow!("only 'Administrator' role can reset other users passwords."));
    }

    if user_role == "admin" {
        return Err(anyhow!("cannot reset Administrator's password."));
    }

    let new_hash = hash_password(new_password)?;

    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![new_hash, user_id],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?1, 'password_changed', 'user', ?2)",
        params![actor_id, user_id],
    );

    Ok(())
}

pub fn change_password(
    conn: &Connection,
    user_id: &str,
    old_password: &str,
    new_password: &str,
) -> Result<()> {
    let hash: String =
        conn.query_row("SELECT password_hash FROM users WHERE id = ?1", params![user_id], |r| {
            r.get(0)
        })?;

    if !verify_password(old_password, &hash)? {
        return Err(anyhow!("current password is incorrect"));
    }

    let new_hash = hash_password(new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![new_hash, user_id],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action) VALUES (?1, 'password_changed')",
        params![user_id],
    );

    Ok(())
}
