use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub test_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileWithTests {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub investigation_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewProfile {
    pub name: String,
    pub description: Option<String>,
    pub investigation_ids: Vec<String>,
}

pub fn list_profiles(conn: &Connection) -> Result<Vec<Profile>> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.name, p.description, p.is_active, p.created_at,
                (SELECT COUNT(*) FROM profile_investigations pi WHERE pi.profile_id = p.id) as test_count
         FROM profiles p
         ORDER BY p.name ASC",
    )?;

    let profiles: Vec<Profile> = stmt
        .query_map([], |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                is_active: row.get::<_, i64>(3)? != 0,
                created_at: row.get(4)?,
                test_count: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(profiles)
}

pub fn get_profile(conn: &Connection, id: &str) -> Result<ProfileWithTests> {
    let (name, description, is_active): (String, Option<String>, i64) = conn
        .query_row(
            "SELECT name, description, is_active FROM profiles WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| anyhow!("Profile not found: {}", e))?;

    let mut stmt =
        conn.prepare("SELECT investigation_id FROM profile_investigations WHERE profile_id = ?1")?;
    let investigation_ids: Vec<String> =
        stmt.query_map(params![id], |row| row.get(0))?.filter_map(|r| r.ok()).collect();

    Ok(ProfileWithTests {
        id: id.to_string(),
        name,
        description,
        is_active: is_active != 0,
        investigation_ids,
    })
}

pub fn create_profile(
    conn: &Connection,
    p: NewProfile,
    actor_id: &str,
) -> Result<ProfileWithTests> {
    if p.name.trim().is_empty() {
        return Err(anyhow!("Profile name is required"));
    }
    if p.investigation_ids.is_empty() {
        return Err(anyhow!("Profile must include at least one test"));
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO profiles (id, name, description) VALUES (?1, ?2, ?3)",
        params![id, p.name, p.description],
    )?;

    for inv_id in &p.investigation_ids {
        conn.execute(
            "INSERT INTO profile_investigations (profile_id, investigation_id) VALUES (?1, ?2)",
            params![id, inv_id],
        )?;
    }

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'profile_created', 'profile', ?2)",
        params![actor_id, id],
    );

    get_profile(conn, &id)
}

pub fn update_profile(
    conn: &Connection,
    id: &str,
    p: NewProfile,
    actor_id: &str,
) -> Result<ProfileWithTests> {
    if p.name.trim().is_empty() {
        return Err(anyhow!("Profile name is required"));
    }
    if p.investigation_ids.is_empty() {
        return Err(anyhow!("Profile must include at least one test"));
    }

    conn.execute(
        "UPDATE profiles SET name = ?1, description = ?2 WHERE id = ?3",
        params![p.name, p.description, id],
    )?;

    conn.execute("DELETE FROM profile_investigations WHERE profile_id = ?1", params![id])?;
    for inv_id in &p.investigation_ids {
        conn.execute(
            "INSERT INTO profile_investigations (profile_id, investigation_id) VALUES (?1, ?2)",
            params![id, inv_id],
        )?;
    }

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'profile_updated', 'profile', ?2)",
        params![actor_id, id],
    );

    get_profile(conn, id)
}

pub fn set_profile_active(conn: &Connection, id: &str, active: bool, actor_id: &str) -> Result<()> {
    conn.execute("UPDATE profiles SET is_active = ?1 WHERE id = ?2", params![active as i64, id])?;
    let action = if active {
        "profile_enabled"
    } else {
        "profile_disabled"
    };
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, ?2, 'profile', ?3)",
        params![actor_id, action, id],
    );
    Ok(())
}

pub fn delete_profile(conn: &Connection, id: &str, actor_id: &str) -> Result<()> {
    conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'profile_deleted', 'profile', ?2)",
        params![actor_id, id],
    );
    Ok(())
}
