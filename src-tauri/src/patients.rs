use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub id: String,
    pub patient_no: String,
    pub full_name: String,
    pub date_of_birth: Option<String>,
    pub age_override: Option<i64>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub email: Option<String>,
    pub referring_physician: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewPatient {
    pub full_name: String,
    pub date_of_birth: Option<String>,
    pub age_override: Option<i64>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub email: Option<String>,
    pub referring_physician: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DuplicateWarning {
    pub patient_id: String,
    pub patient_no: String,
    pub full_name: String,
    pub matched_on: String, //phone or name+dob
}

const PATIENT_COLUMN: &str = r#"
    id, patient_no, full_name, date_of_birth, age_override, gender, phone, address, email, referring_physician, notes, created_at, updated_at
"#;

fn row_to_patient(row: &rusqlite::Row) -> rusqlite::Result<Patient> {
    Ok(Patient {
        id: row.get(0)?,
        patient_no: row.get(1)?,
        full_name: row.get(2)?,
        date_of_birth: row.get(3)?,
        age_override: row.get(4)?,
        gender: row.get(5)?,
        phone: row.get(6)?,
        address: row.get(7)?,
        email: row.get(8)?,
        referring_physician: row.get(9)?,
        notes: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

//------------- Genrate next sequantial patient number ---
fn next_patient_no(conn: &Connection) -> Result<String> {
    conn.execute("UPDATE patient_counter SET value= value+1 WHERE id = 1", [])?;
    let value: i64 =
        conn.query_row("SELECT value FROM patient_counter WHERE id = 1", [], |r| r.get(0))?;
    Ok(format!("P-{:06}", value))
}

//--- Duplicate detection ---------
pub fn check_dublicates(
    conn: &Connection,
    full_name: &str,
    phone: Option<&str>,
    dob: Option<&str>,
) -> Result<Vec<DuplicateWarning>> {
    let mut warnings = Vec::new();

    //match by phone
    if let Some(phone) = phone {
        if !phone.trim().is_empty() {
            let mut stmt =
                conn.prepare("SELECT id, patient_no, full_name FROM patients WHERE phone = ?1")?;
            let rows = stmt.query_map(params![phone], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
            })?;

            for r in rows.filter_map(|r| r.ok()) {
                warnings.push(DuplicateWarning {
                    patient_id: r.0,
                    patient_no: r.1,
                    full_name: r.2,
                    matched_on: "phone".to_string(),
                });
            }
        }
    }

    // match by name + dob

    if let Some(dob) = dob {
        if !dob.trim().is_empty() {
            let mut stmt =
                conn.prepare("SELECT id, patient_no, full_name FROM patients WHERE full_name = ?1 COLLATE NOCASE AND date_of_birth = ?2")?;
            let rows = stmt.query_map(params![full_name, dob], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
            })?;

            for r in rows.filter_map(|r| r.ok()) {
                warnings.push(DuplicateWarning {
                    patient_id: r.0,
                    patient_no: r.1,
                    full_name: r.2,
                    matched_on: "name+dob".to_string(),
                });
            }
        }
    }

    Ok(warnings)
}

// ------ crud ---------
pub fn create_patient(conn: &Connection, p: NewPatient, actor_id: &str) -> Result<Patient> {
    let id = uuid::Uuid::new_v4().to_string();
    let patient_no = next_patient_no(conn)?;

    conn.execute(
        "INSERT INTO patients (id, patient_no, full_name, date_of_birth, age_override, gender,
    phone, address, email, referring_physician, notes, created_by) VALUES
    (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            id,
            patient_no,
            p.full_name,
            p.date_of_birth,
            p.age_override,
            p.gender,
            p.phone,
            p.address,
            p.email,
            p.referring_physician,
            p.notes,
            actor_id
        ],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
        VALUES (?1, 'patient_created', 'patient', ?2)",
        params![actor_id, id],
    );
    get_patient(conn, &id)
}

pub fn get_patient(conn: &Connection, id: &str) -> Result<Patient> {
    let sql = format!("SELECT {} FROM patients WHERE id = ?1", PATIENT_COLUMN);
    conn.query_row(&sql, params![id], row_to_patient)
        .map_err(|e| anyhow!("Patient not found: {}", e))
}

pub fn update_patient(
    conn: &Connection,
    id: &str,
    p: NewPatient,
    actor_id: &str,
) -> Result<Patient> {
    if p.full_name.trim().is_empty() {
        return Err(anyhow!("full name is required"));
    }

    conn.execute(
        "UPDATE patients SET full_name = ?1, date_of_birth = ?2, age_override = ?3, gender = ?4, phone = ?5, address = ?6, email = ?7, referring_physician = ?8, notes = ?9, updated_at = datetime('now') WHERE id = ?10",
        params![
            p.full_name,
            p.date_of_birth,
            p.age_override,
            p.gender,
            p.phone,
            p.address,
            p.email,
            p.referring_physician,
            p.notes,
            id
        ],
    )?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
        VALUES (?1, 'patient_updated', 'patient', ?2)",
        params![actor_id, id],
    );

    get_patient(conn, id)
}

pub fn delete_patient(conn: &Connection, id: &str, actor_id: &str) -> Result<()> {
    conn.execute("DELETE FROM patients WHERE id = ?1", params![id])?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
        VALUES (?1, 'patient_deleted', 'patient', ?2)",
        params![actor_id, id],
    );

    Ok(())
}

pub fn search_patients(conn: &Connection, query: &str, limit: i64) -> Result<Vec<Patient>> {
    let pattern = format!("%{}%", query.trim());
    let sql = format!(
        "SELECT {} FROM patients WHERE full_name LIKE ?1 COLLATE NOCASE OR patient_no LIKE ?1 OR phone LIKE ?1 ORDER BY created_at DESC LIMIT ?2",
        PATIENT_COLUMN
    );
    let mut stmt = conn.prepare(&sql)?;

    let patients: Vec<Patient> = stmt
        .query_map(params![pattern, limit], row_to_patient)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(patients)
}

pub fn list_patients(conn: &Connection, limit: i64, offset: i64) -> Result<Vec<Patient>> {
    let sql = format!(
        "SELECT {} FROM patients ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
        PATIENT_COLUMN
    );
    let mut stmt = conn.prepare(&sql)?;
    let patients: Vec<Patient> = stmt
        .query_map(params![limit, offset], row_to_patient)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(patients)
}
