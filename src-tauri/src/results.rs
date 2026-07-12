use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Result_ {
    pub id: String,
    pub request_item_id: String,
    pub test_code: String,
    pub test_name: String,
    pub unit: Option<String>,
    pub numeric_value: Option<f64>,
    pub text_value: Option<String>,
    pub flag: Option<String>,
    pub is_draft: bool,
    pub notes: Option<String>,
    pub entered_by: Option<String>,
    pub entered_at: String,
    pub updated_at: String,
    // Reference range for display
    pub ref_min: Option<f64>,
    pub ref_max: Option<f64>,
    pub ref_age_group: Option<String>,
    pub ref_gender: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestResultsView {
    pub request_id: String,
    pub request_no: String,
    pub patient_id: String,
    pub patient_name: String,
    pub patient_no: String,
    pub patient_dob: Option<String>,
    pub patient_age: Option<i64>,
    pub patient_gender: Option<String>,
    pub results: Vec<Result_>,
}

#[derive(Debug, Deserialize)]
pub struct SaveResult {
    pub request_item_id: String,
    pub numeric_value: Option<f64>,
    pub text_value: Option<String>,
    pub notes: Option<String>,
    pub is_draft: bool,
}

/// Determine age group string from age in years
fn age_to_group(age_years: f64) -> &'static str {
    match age_years as u32 {
        0 => "neonate",
        1..=2 => "infant",
        3..=11 => "child",
        12..=17 => "adolescent",
        18..=64 => "adult",
        _ => "elderly",
    }
}

/// Calculate patient age in years from DOB string or age_override
fn resolve_age(dob: Option<&str>, age_override: Option<i64>) -> Option<f64> {
    if let Some(dob) = dob {
        if dob.len() >= 4 {
            let birth_year: i32 = dob[..4].parse().ok()?;
            let current_year = 2026i32; // updated at build time; good enough for age groups
            return Some((current_year - birth_year) as f64);
        }
    }
    age_override.map(|a| a as f64)
}

/// Find the best matching reference range for a patient
fn find_reference_range(
    conn: &Connection,
    investigation_id: &str,
    age_group: &str,
    gender: Option<&str>,
) -> Option<(f64, f64, String, String)> {
    // Try exact gender match first, then fall back to "any"
    let genders_to_try: Vec<&str> = match gender {
        Some(g) => vec![g, "any"],
        None => vec!["any"],
    };

    for g in genders_to_try {
        if let Ok((min, max, ag, gen)) = conn.query_row(
            "SELECT min_value, max_value, age_group, gender FROM reference_ranges
             WHERE investigation_id = ?1 AND age_group = ?2 AND gender = ?3
             LIMIT 1",
            params![investigation_id, age_group, g],
            |row| {
                Ok((
                    row.get::<_, Option<f64>>(0)?,
                    row.get::<_, Option<f64>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        ) {
            if min.is_some() || max.is_some() {
                return Some((
                    min.unwrap_or(f64::NEG_INFINITY),
                    max.unwrap_or(f64::INFINITY),
                    ag,
                    gen,
                ));
            }
        }
    }

    // Fall back to adult/any if no match found
    conn.query_row(
        "SELECT min_value, max_value, age_group, gender FROM reference_ranges
         WHERE investigation_id = ?1 AND age_group = 'adult'
         ORDER BY CASE gender WHEN 'any' THEN 0 ELSE 1 END LIMIT 1",
        params![investigation_id],
        |row| {
            Ok((
                row.get::<_, Option<f64>>(0)?.unwrap_or(f64::NEG_INFINITY),
                row.get::<_, Option<f64>>(1)?.unwrap_or(f64::INFINITY),
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        },
    )
    .ok()
}

/// Determine flag based on value and reference range + critical thresholds
fn compute_flag(
    value: f64,
    ref_min: f64,
    ref_max: f64,
    critical_low: Option<f64>,
    critical_high: Option<f64>,
) -> &'static str {
    if let Some(cl) = critical_low {
        if value < cl {
            return "critical_low";
        }
    }
    if let Some(ch) = critical_high {
        if value > ch {
            return "critical_high";
        }
    }
    if value < ref_min {
        return "low";
    }
    if value > ref_max {
        return "high";
    }
    "normal"
}

pub fn get_request_results(conn: &Connection, request_id: &str) -> Result<RequestResultsView> {
    // Fetch request + patient info
    let (
        request_no,
        patient_id,
        patient_name,
        patient_no,
        patient_dob,
        patient_age,
        patient_gender,
    ): (String, String, String, String, Option<String>, Option<i64>, Option<String>) = conn
        .query_row(
            "SELECT r.request_no, p.id, p.full_name, p.patient_no,
                    p.date_of_birth, p.age_override, p.gender
             FROM lab_requests r
             JOIN patients p ON p.id = r.patient_id
             WHERE r.id = ?1",
            params![request_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .map_err(|e| anyhow!("Request not found: {}", e))?;

    // Determine age group
    let age_years = resolve_age(patient_dob.as_deref(), patient_age);
    let age_group = age_years.map(age_to_group).unwrap_or("adult");
    let gender_str = patient_gender.as_deref();

    // Fetch all items for this request with their investigation details
    let mut stmt = conn.prepare(
        "SELECT ri.id, i.id, i.test_code, i.test_name, i.unit,
                i.critical_low, i.critical_high
         FROM lab_request_items ri
         JOIN investigations i ON i.id = ri.investigation_id
         WHERE ri.request_id = ?1",
    )?;

    let items: Vec<(String, String, String, String, Option<String>, Option<f64>, Option<f64>)> =
        stmt.query_map(params![request_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut results = Vec::new();

    for (item_id, inv_id, test_code, test_name, unit, _critical_low, _critical_high) in items {
        // Find reference range for this patient
        let ref_range = find_reference_range(conn, &inv_id, age_group, gender_str);
        let (ref_min, ref_max, ref_ag, ref_gen) = match ref_range {
            Some((min, max, ag, gen)) => (Some(min), Some(max), Some(ag), Some(gen)),
            None => (None, None, None, None),
        };

        // Try to load existing result
        let existing = conn.query_row(
            "SELECT id, numeric_value, text_value, flag, is_draft, notes, entered_by, entered_at, updated_at
             FROM results WHERE request_item_id = ?1",
            params![item_id],
            |row| Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<f64>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, String>(7)?,
                row.get::<_, String>(8)?,
            )),
        ).ok();

        let result = match existing {
            Some((id, num, txt, flag, is_draft, notes, entered_by, entered_at, updated_at)) => {
                Result_ {
                    id,
                    request_item_id: item_id,
                    test_code,
                    test_name,
                    unit,
                    numeric_value: num,
                    text_value: txt,
                    flag,
                    is_draft: is_draft != 0,
                    notes,
                    entered_by,
                    entered_at,
                    updated_at,
                    ref_min,
                    ref_max,
                    ref_age_group: ref_ag,
                    ref_gender: ref_gen,
                }
            },
            None => Result_ {
                id: String::new(),
                request_item_id: item_id,
                test_code,
                test_name,
                unit,
                numeric_value: None,
                text_value: None,
                flag: None,
                is_draft: true,
                notes: None,
                entered_by: None,
                entered_at: String::new(),
                updated_at: String::new(),
                ref_min,
                ref_max,
                ref_age_group: ref_ag,
                ref_gender: ref_gen,
            },
        };

        results.push(result);
    }

    Ok(RequestResultsView {
        request_id: request_id.to_string(),
        request_no,
        patient_id,
        patient_name,
        patient_no,
        patient_dob,
        patient_age,
        patient_gender,
        results,
    })
}

pub fn save_result(conn: &Connection, entry: SaveResult, actor_id: &str) -> Result<()> {
    // Get investigation details for auto-flagging
    let (inv_id, critical_low, critical_high): (String, Option<f64>, Option<f64>) = conn
        .query_row(
            "SELECT i.id, i.critical_low, i.critical_high
         FROM lab_request_items ri
         JOIN investigations i ON i.id = ri.investigation_id
         WHERE ri.id = ?1",
            params![entry.request_item_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| anyhow!("Request item not found"))?;

    // Get patient info for reference range lookup
    let (patient_dob, patient_age, patient_gender): (Option<String>, Option<i64>, Option<String>) =
        conn.query_row(
            "SELECT p.date_of_birth, p.age_override, p.gender
             FROM lab_request_items ri
             JOIN lab_requests r ON r.id = ri.request_id
             JOIN patients p ON p.id = r.patient_id
             WHERE ri.id = ?1",
            params![entry.request_item_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((None, None, None));

    let age_years = resolve_age(patient_dob.as_deref(), patient_age);
    let age_group = age_years.map(age_to_group).unwrap_or("adult");
    let ref_range = find_reference_range(conn, &inv_id, age_group, patient_gender.as_deref());

    // Auto-compute flag for numeric results
    let flag = if let Some(num) = entry.numeric_value {
        if let Some((ref_min, ref_max, _, _)) = ref_range {
            Some(compute_flag(num, ref_min, ref_max, critical_low, critical_high).to_string())
        } else {
            None
        }
    } else {
        None
    };

    // Check if result already exists
    let existing_id: Option<String> = conn
        .query_row(
            "SELECT id FROM results WHERE request_item_id = ?1",
            params![entry.request_item_id],
            |row| row.get(0),
        )
        .ok();

    match existing_id {
        Some(result_id) => {
            // Fetch old values for audit
            let (old_num, old_flag): (Option<f64>, Option<String>) = conn
                .query_row(
                    "SELECT numeric_value, flag FROM results WHERE id = ?1",
                    params![result_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .unwrap_or((None, None));

            conn.execute(
                "UPDATE results SET
                    numeric_value = ?1, text_value = ?2, flag = ?3,
                    is_draft = ?4, notes = ?5, entered_by = ?6,
                    updated_at = datetime('now')
                 WHERE id = ?7",
                params![
                    entry.numeric_value,
                    entry.text_value,
                    flag,
                    entry.is_draft as i64,
                    entry.notes,
                    actor_id,
                    result_id
                ],
            )?;

            // Write audit trail
            conn.execute(
                "INSERT INTO result_audit (result_id, changed_by, old_value, new_value, old_flag, new_flag)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    result_id, actor_id,
                    old_num.map(|v| v.to_string()),
                    entry.numeric_value.map(|v| v.to_string()),
                    old_flag, flag
                ],
            )?;
        },
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO results
                    (id, request_item_id, numeric_value, text_value, flag, is_draft, notes, entered_by)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![
                    id, entry.request_item_id, entry.numeric_value, entry.text_value,
                    flag, entry.is_draft as i64, entry.notes, actor_id
                ],
            )?;
        },
    }

    // Auto-update request item status when result is finalized
    if !entry.is_draft {
        conn.execute(
            "UPDATE lab_request_items SET status = 'completed' WHERE id = ?1",
            params![entry.request_item_id],
        )?;
    }

    Ok(())
}

pub fn finalize_all_results(conn: &Connection, request_id: &str, actor_id: &str) -> Result<()> {
    conn.execute(
        "UPDATE results SET is_draft = 0, updated_at = datetime('now')
         WHERE request_item_id IN (
             SELECT id FROM lab_request_items WHERE request_id = ?1
         )",
        params![request_id],
    )?;
    conn.execute(
        "UPDATE lab_request_items SET status = 'completed' WHERE request_id = ?1",
        params![request_id],
    )?;
    conn.execute(
        "UPDATE lab_requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?1",
        params![request_id],
    )?;
    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'results_finalized', 'lab_request', ?2)",
        params![actor_id, request_id],
    );
    Ok(())
}
