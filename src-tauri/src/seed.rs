use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use std::path::Path;
use tracing::{info, warn};

#[derive(Debug, serde::Deserialize)]
struct SeedRow {
    test_code: String,
    test_name: String,
    category: String,
    unit: String,
    cost: f64,
    result_type: String,
    critical_low: Option<f64>,
    critical_high: Option<f64>,
    age_group: String,
    gender: String,
    min_value: Option<f64>,
    max_value: Option<f64>,
}

pub fn import_if_empty(conn: &Connection, csv_path: &Path) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM investigations", [], |r| r.get(0))?;

    if count > 0 {
        info!("Investigations already seeded ({} rows), skipping CSV import", count);
        return Ok(());
    }

    if !csv_path.exists() {
        warn!("Seed CSV not found at {:?}, skipping default investigations", csv_path);
        return Ok(());
    }

    info!("Importing default investigations from {:?}", csv_path);

    let mut rdr =
        csv::Reader::from_path(csv_path).map_err(|e| anyhow!("Failed to open CSV: {}", e))?;

    let mut category_cache: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut investigations_cache: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();

    let mut imported_tests = 0;
    let mut imported_ranges = 0;

    for result in rdr.deserialize() {
        let row: SeedRow = match result {
            Ok(r) => r,
            Err(e) => {
                warn!("Skipping malformed CSV row: {}", e);
                continue;
            },
        };

        let category_id = if let Some(id) = category_cache.get(&row.category) {
            id.clone()
        } else {
            let existing: Option<String> = conn
                .query_row(
                    "SELECT id FROM investigation_categories WHERE name = ?1",
                    params![row.category],
                    |r| r.get(0),
                )
                .ok();

            let id = match existing {
                Some(id) => id,
                None => {
                    let new_id = uuid::Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO investigation_categories (id, name) VALUES (?1, ?2)",
                        params![new_id, row.category],
                    )?;

                    new_id
                },
            };

            category_cache.insert(row.category.clone(), id.clone());
            id
        };
        let investigation_id = if let Some(id) = investigations_cache.get(&row.test_code) {
            id.clone()
        } else {
            let new_id = uuid::Uuid::new_v4().to_string();
            conn.execute("INSERT INTO investigations (id, test_code, test_name, category_id, unit, cost, result_type, critical_low, critical_high) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)", params![new_id, row.test_code, row.test_name, category_id, row.unit, row.cost, row.result_type, row.critical_low, row.critical_high])?;

            imported_tests += 1;
            investigations_cache.insert(row.test_code.clone(), new_id.clone());
            new_id
        };

        conn.execute("INSERT INTO reference_ranges (id, investigation_id, age_group, gender, min_value, max_value, is_default) VALUES (?1,?2,?3,?4,?5,?6,1)", params![uuid::Uuid::new_v4().to_string(), investigation_id, row.age_group, row.gender, row.min_value, row.max_value])?;

        imported_ranges += 1;
    }

    info!(
        "Default investigation import complete: {} tests, {} reference ranges",
        imported_tests, imported_ranges
    );
    Ok(())
}
