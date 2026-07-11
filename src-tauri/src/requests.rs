use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::patients::{self, NewPatient, Patient};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabRequest {
    pub id: String,
    pub request_no: String,
    pub patient_id: String,
    pub patient_name: String,
    pub patient_no: String,
    pub status: String,
    pub priority: String,
    pub request_date: String,
    pub collection_date: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub item_count: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestItem {
    pub id: String,
    pub request_id: String,
    pub investigation_id: String,
    pub test_code: String,
    pub test_name: String,
    pub status: String,
    pub price_at_order: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestDetail {
    pub id: String,
    pub request_no: String,
    pub patient: Patient,
    pub status: String,
    pub priority: String,
    pub request_date: String,
    pub collection_date: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<RequestItem>,
}

#[derive(Debug, Deserialize)]
pub struct NewRequest {
    pub patient_id: String,
    pub investigation_ids: Vec<String>,
    pub priority: String,
    pub collection_date: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewPatientWithRequest {
    pub patient: NewPatient,
    pub investigation_ids: Vec<String>,
    pub priority: String,
    pub collection_date: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
}

const VALID_STATUSES: [&str; 6] = [
    "pending",
    "sample_collected",
    "in_progress",
    "completed",
    "delivered",
    "cancelled",
];

fn next_request_no(conn: &Connection) -> Result<String> {
    conn.execute("UPDATE request_counter SET value = value + 1 WHERE id = 1", [])?;
    let value: i64 =
        conn.query_row("SELECT value FROM request_counter WHERE id = 1", [], |r| r.get(0))?;
    Ok(format!("R-{:06}", value))
}

fn insert_items(conn: &Connection, request_id: &str, investigation_ids: &[String]) -> Result<()> {
    if investigation_ids.is_empty() {
        return Err(anyhow!("A request must include at least one investigation"));
    }
    for inv_id in investigation_ids {
        let cost: f64 = conn
            .query_row("SELECT cost FROM investigations WHERE id = ?1", params![inv_id], |r| {
                r.get(0)
            })
            .map_err(|_| anyhow!("Investigation not found: {}", inv_id))?;

        conn.execute(
            "INSERT INTO lab_request_items (id, request_id, investigation_id, price_at_order)
             VALUES (?1, ?2, ?3, ?4)",
            params![uuid::Uuid::new_v4().to_string(), request_id, inv_id, cost],
        )?;
    }
    Ok(())
}

pub fn create_request(conn: &Connection, req: NewRequest, actor_id: &str) -> Result<RequestDetail> {
    let id = uuid::Uuid::new_v4().to_string();
    let request_no = next_request_no(conn)?;

    conn.execute(
        "INSERT INTO lab_requests
            (id, request_no, patient_id, priority, collection_date, due_date, notes, created_by)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![
            id,
            request_no,
            req.patient_id,
            req.priority,
            req.collection_date,
            req.due_date,
            req.notes,
            actor_id
        ],
    )?;

    insert_items(conn, &id, &req.investigation_ids)?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'request_created', 'lab_request', ?2)",
        params![actor_id, id],
    );

    get_request(conn, &id)
}

/// Combined flow: register a brand-new patient AND create their first request, atomically.
pub fn create_patient_with_request(
    conn: &Connection,
    payload: NewPatientWithRequest,
    actor_id: &str,
) -> Result<RequestDetail> {
    conn.execute("BEGIN", [])?;

    let result = (|| -> Result<RequestDetail> {
        let patient = patients::create_patient(conn, payload.patient, actor_id)?;

        let req = NewRequest {
            patient_id: patient.id.clone(),
            investigation_ids: payload.investigation_ids,
            priority: payload.priority,
            collection_date: payload.collection_date,
            due_date: payload.due_date,
            notes: payload.notes,
        };

        create_request(conn, req, actor_id)
    })();

    match result {
        Ok(detail) => {
            conn.execute("COMMIT", [])?;
            Ok(detail)
        },
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(e)
        },
    }
}

pub fn get_request(conn: &Connection, id: &str) -> Result<RequestDetail> {
    let (request_no, patient_id, status, priority, request_date, collection_date, due_date, notes):
        (String, String, String, String, String, Option<String>, Option<String>, Option<String>) =
        conn.query_row(
            "SELECT request_no, patient_id, status, priority, request_date, collection_date, due_date, notes
             FROM lab_requests WHERE id = ?1",
            params![id],
            |row| Ok((
                row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?,
                row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?,
            )),
        ).map_err(|e| anyhow!("Request not found: {}", e))?;

    let patient = patients::get_patient(conn, &patient_id)?;

    let mut stmt = conn.prepare(
        "SELECT ri.id, ri.request_id, ri.investigation_id, i.test_code, i.test_name, ri.status, ri.price_at_order
         FROM lab_request_items ri
         JOIN investigations i ON i.id = ri.investigation_id
         WHERE ri.request_id = ?1",
    )?;
    let items: Vec<RequestItem> = stmt
        .query_map(params![id], |row| {
            Ok(RequestItem {
                id: row.get(0)?,
                request_id: row.get(1)?,
                investigation_id: row.get(2)?,
                test_code: row.get(3)?,
                test_name: row.get(4)?,
                status: row.get(5)?,
                price_at_order: row.get(6)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(RequestDetail {
        id: id.to_string(),
        request_no,
        patient,
        status,
        priority,
        request_date,
        collection_date,
        due_date,
        notes,
        items,
    })
}

pub fn list_requests(
    conn: &Connection,
    status: Option<&str>,
    search: Option<&str>,
    limit: i64,
) -> Result<Vec<LabRequest>> {
    let mut sql = "
        SELECT r.id, r.request_no, r.patient_id, p.full_name, p.patient_no,
               r.status, r.priority, r.request_date, r.collection_date, r.due_date, r.notes,
               (SELECT COUNT(*) FROM lab_request_items WHERE request_id = r.id) as item_count,
               r.created_at
        FROM lab_requests r
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1"
        .to_string();

    if status.is_some() {
        sql.push_str(" AND r.status = ?1");
    }
    if search.is_some() {
        let clause = if status.is_some() {
            " AND (p.full_name LIKE ?2 COLLATE NOCASE OR r.request_no LIKE ?2 OR p.patient_no LIKE ?2)"
        } else {
            " AND (p.full_name LIKE ?1 COLLATE NOCASE OR r.request_no LIKE ?1 OR p.patient_no LIKE ?1)"
        };
        sql.push_str(clause);
    }
    sql.push_str(" ORDER BY r.request_date DESC LIMIT ?");
    sql = sql.replacen("LIMIT ?", &format!("LIMIT {}", limit), 1);

    let mut stmt = conn.prepare(&sql)?;

    let row_mapper = |row: &rusqlite::Row| -> rusqlite::Result<LabRequest> {
        Ok(LabRequest {
            id: row.get(0)?,
            request_no: row.get(1)?,
            patient_id: row.get(2)?,
            patient_name: row.get(3)?,
            patient_no: row.get(4)?,
            status: row.get(5)?,
            priority: row.get(6)?,
            request_date: row.get(7)?,
            collection_date: row.get(8)?,
            due_date: row.get(9)?,
            notes: row.get(10)?,
            item_count: row.get(11)?,
            created_at: row.get(12)?,
        })
    };

    let requests: Vec<LabRequest> = match (status, search) {
        (Some(s), Some(q)) => {
            let pattern = format!("%{}%", q.trim());
            stmt.query_map(params![s, pattern], row_mapper)?
        },
        (Some(s), None) => stmt.query_map(params![s], row_mapper)?,
        (None, Some(q)) => {
            let pattern = format!("%{}%", q.trim());
            stmt.query_map(params![pattern], row_mapper)?
        },
        (None, None) => stmt.query_map([], row_mapper)?,
    }
    .filter_map(|r| r.ok())
    .collect();

    Ok(requests)
}

pub fn update_request_status(
    conn: &Connection,
    id: &str,
    status: &str,
    actor_id: &str,
) -> Result<()> {
    if !VALID_STATUSES.contains(&status) {
        return Err(anyhow!("Invalid status: {}", status));
    }
    conn.execute(
        "UPDATE lab_requests SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![status, id],
    )?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
         VALUES (?1, 'request_status_changed', 'lab_request', ?2, ?3)",
        params![actor_id, id, status],
    );
    Ok(())
}

pub fn update_item_status(
    conn: &Connection,
    item_id: &str,
    status: &str,
    actor_id: &str,
) -> Result<()> {
    if !VALID_STATUSES.contains(&status) {
        return Err(anyhow!("Invalid status: {}", status));
    }
    conn.execute(
        "UPDATE lab_request_items SET status = ?1 WHERE id = ?2",
        params![status, item_id],
    )?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
         VALUES (?1, 'request_item_status_changed', 'lab_request_item', ?2, ?3)",
        params![actor_id, item_id, status],
    );
    Ok(())
}

pub fn delete_request(conn: &Connection, id: &str, actor_id: &str) -> Result<()> {
    conn.execute("DELETE FROM lab_requests WHERE id = ?1", params![id])?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'request_deleted', 'lab_request', ?2)",
        params![actor_id, id],
    );
    Ok(())
}
