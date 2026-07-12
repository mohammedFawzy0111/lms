use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Investigation {
    pub id: String,
    pub test_code: String,
    pub test_name: String,
    pub category_id: Option<String>,
    pub category_name: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub cost: f64,
    pub result_type: String,
    pub is_active: bool,
    pub critical_low: Option<f64>,
    pub critical_high: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewInvestigation {
    pub test_code: String,
    pub test_name: String,
    pub category_id: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub cost: f64,
    pub result_type: String,
    pub critical_low: Option<f64>,
    pub critical_high: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceRange {
    pub id: String,
    pub investigation_id: String,
    pub age_group: String,
    pub gender: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct NewReferenceRange {
    pub age_group: String,
    pub gender: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
}

const INV_COLUMNS: &str = "i.id, i.test_code, i.test_name, i.category_id, c.name,
    i.description, i.unit, i.cost, i.result_type, i.is_active,
    i.critical_low, i.critical_high, i.created_at, i.updated_at";

fn row_to_investigation(row: &rusqlite::Row) -> rusqlite::Result<Investigation> {
    Ok(Investigation {
        id: row.get(0)?,
        test_code: row.get(1)?,
        test_name: row.get(2)?,
        category_id: row.get(3)?,
        category_name: row.get(4)?,
        description: row.get(5)?,
        unit: row.get(6)?,
        cost: row.get(7)?,
        result_type: row.get(8)?,
        is_active: row.get::<_, i64>(9)? != 0,
        critical_low: row.get(10)?,
        critical_high: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

// ── Categories ─────────────────────────────────────────────────────────────────

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>> {
    let mut stmt =
        conn.prepare("SELECT id, name FROM investigation_categories ORDER BY name ASC")?;
    let categories = stmt
        .query_map([], |row| Ok(Category { id: row.get(0)?, name: row.get(1)? }))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(categories)
}

pub fn create_category(conn: &Connection, name: &str) -> Result<Category> {
    if name.trim().is_empty() {
        return Err(anyhow!("Category name is required"));
    }
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO investigation_categories (id, name) VALUES (?1, ?2)",
        params![id, name],
    )?;
    Ok(Category { id, name: name.to_string() })
}

// ── Investigations CRUD ─────────────────────────────────────────────────────────

pub fn create_investigation(
    conn: &Connection,
    inv: NewInvestigation,
    actor_id: &str,
) -> Result<Investigation> {
    if inv.test_code.trim().is_empty() || inv.test_name.trim().is_empty() {
        return Err(anyhow!("Test code and test name are required"));
    }

    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM investigations WHERE test_code = ?1 COLLATE NOCASE",
        params![inv.test_code],
        |r| r.get(0),
    )?;
    if exists > 0 {
        return Err(anyhow!("Test code already exists"));
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO investigations
            (id, test_code, test_name, category_id, description, unit, cost,
             result_type, critical_low, critical_high)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            id,
            inv.test_code,
            inv.test_name,
            inv.category_id,
            inv.description,
            inv.unit,
            inv.cost,
            inv.result_type,
            inv.critical_low,
            inv.critical_high
        ],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'investigation_created', 'investigation', ?2)",
        params![actor_id, id],
    );

    get_investigation(conn, &id)
}

pub fn get_investigation(conn: &Connection, id: &str) -> Result<Investigation> {
    let sql = format!(
        "SELECT {} FROM investigations i
         LEFT JOIN investigation_categories c ON c.id = i.category_id
         WHERE i.id = ?1",
        INV_COLUMNS
    );
    conn.query_row(&sql, params![id], row_to_investigation)
        .map_err(|e| anyhow!("Investigation not found: {}", e))
}

pub fn update_investigation(
    conn: &Connection,
    id: &str,
    inv: NewInvestigation,
    actor_id: &str,
) -> Result<Investigation> {
    if inv.test_code.trim().is_empty() || inv.test_name.trim().is_empty() {
        return Err(anyhow!("Test code and test name are required"));
    }

    conn.execute(
        "UPDATE investigations SET
            test_code = ?1, test_name = ?2, category_id = ?3, description = ?4,
            unit = ?5, cost = ?6, result_type = ?7, critical_low = ?8, critical_high = ?9,
            updated_at = datetime('now')
         WHERE id = ?10",
        params![
            inv.test_code,
            inv.test_name,
            inv.category_id,
            inv.description,
            inv.unit,
            inv.cost,
            inv.result_type,
            inv.critical_low,
            inv.critical_high,
            id
        ],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'investigation_updated', 'investigation', ?2)",
        params![actor_id, id],
    );

    get_investigation(conn, id)
}

pub fn set_investigation_active(
    conn: &Connection,
    id: &str,
    active: bool,
    actor_id: &str,
) -> Result<()> {
    conn.execute(
        "UPDATE investigations SET is_active = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![active as i64, id],
    )?;
    let action = if active {
        "investigation_enabled"
    } else {
        "investigation_disabled"
    };
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, ?2, 'investigation', ?3)",
        params![actor_id, action, id],
    );
    Ok(())
}

pub fn delete_investigation(conn: &Connection, id: &str, actor_id: &str) -> Result<()> {
    conn.execute("DELETE FROM investigations WHERE id = ?1", params![id])?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'investigation_deleted', 'investigation', ?2)",
        params![actor_id, id],
    );
    Ok(())
}

pub fn list_investigations(
    conn: &Connection,
    category_id: Option<&str>,
    search: Option<&str>,
    include_inactive: bool,
) -> Result<Vec<Investigation>> {
    let mut sql = format!(
        "SELECT {} FROM investigations i
         LEFT JOIN investigation_categories c ON c.id = i.category_id
         WHERE 1=1",
        INV_COLUMNS
    );

    if !include_inactive {
        sql.push_str(" AND i.is_active = 1");
    }
    if category_id.is_some() {
        sql.push_str(" AND i.category_id = ?1");
    }
    if search.is_some() {
        let clause = if category_id.is_some() {
            " AND (i.test_name LIKE ?2 COLLATE NOCASE OR i.test_code LIKE ?2 COLLATE NOCASE)"
        } else {
            " AND (i.test_name LIKE ?1 COLLATE NOCASE OR i.test_code LIKE ?1 COLLATE NOCASE)"
        };
        sql.push_str(clause);
    }
    sql.push_str(" ORDER BY i.test_name ASC");

    let mut stmt = conn.prepare(&sql)?;

    let investigations: Vec<Investigation> = match (category_id, search) {
        (Some(cat), Some(s)) => {
            let pattern = format!("%{}%", s.trim());
            stmt.query_map(params![cat, pattern], row_to_investigation)?
        },
        (Some(cat), None) => stmt.query_map(params![cat], row_to_investigation)?,
        (None, Some(s)) => {
            let pattern = format!("%{}%", s.trim());
            stmt.query_map(params![pattern], row_to_investigation)?
        },
        (None, None) => stmt.query_map([], row_to_investigation)?,
    }
    .filter_map(|r| r.ok())
    .collect();

    Ok(investigations)
}

// ── Reference Ranges ─────────────────────────────────────────────────────────────

pub fn list_reference_ranges(
    conn: &Connection,
    investigation_id: &str,
) -> Result<Vec<ReferenceRange>> {
    let mut stmt = conn.prepare(
        "SELECT id, investigation_id, age_group, gender, min_value, max_value
         FROM reference_ranges WHERE investigation_id = ?1
         ORDER BY age_group, gender",
    )?;
    let ranges = stmt
        .query_map(params![investigation_id], |row| {
            Ok(ReferenceRange {
                id: row.get(0)?,
                investigation_id: row.get(1)?,
                age_group: row.get(2)?,
                gender: row.get(3)?,
                min_value: row.get(4)?,
                max_value: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(ranges)
}

pub fn add_reference_range(
    conn: &Connection,
    investigation_id: &str,
    r: NewReferenceRange,
) -> Result<ReferenceRange> {
    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO reference_ranges (id, investigation_id, age_group, gender, min_value, max_value, is_default)
         VALUES (?1,?2,?3,?4,?5,?6,0)",
        params![id, investigation_id, r.age_group, r.gender, r.min_value, r.max_value],
    )?;
    Ok(ReferenceRange {
        id,
        investigation_id: investigation_id.to_string(),
        age_group: r.age_group,
        gender: r.gender,
        min_value: r.min_value,
        max_value: r.max_value,
    })
}

pub fn delete_reference_range(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM reference_ranges WHERE id = ?1", params![id])?;
    Ok(())
}
