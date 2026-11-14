//! Demo data for DEBUG builds only. The database is wiped on every debug start, so this
//! fills it with a few users, patients, requests, results and invoices to click through.
//! It goes through the real create/save functions, so counters, flags, invoice totals and
//! the search index are all produced by the normal code paths. The module is compiled
//! out of release builds (`#[cfg(debug_assertions)]` on `mod devseed` in lib.rs).

use anyhow::{anyhow, Context, Result};
use rusqlite::{params, Connection};
use tracing::{info, warn};

use crate::{auth, billing, patients, requests, results};

// (name, gender, date of birth, phone)
const PATIENTS: &[(&str, &str, &str, &str)] = &[
    ("Ahmed Hassan", "male", "1985-03-12", "01012345678"),
    ("Mona Adel", "female", "1992-07-30", "01123456789"),
    ("Youssef Ibrahim", "male", "2018-01-05", "01234567890"),
    ("Salma Khaled", "female", "1978-11-21", "01098765432"),
    ("Omar Farouk", "male", "1950-09-02", "01511223344"),
    ("Nour El-Din", "female", "2001-04-17", "01022334455"),
    ("Karim Mostafa", "male", "1999-12-25", "01166778899"),
    ("Hana Samir", "female", "2023-06-14", "01233445566"),
    ("Tarek Nabil", "male", "1966-02-08", "01099887766"),
    ("Dina Ashraf", "female", "1989-10-19", "01155667788"),
];

const USERS: &[(&str, &str, &str, &str)] = &[
    ("tech", "tech", "Test Technician", "technician"),
    ("reception", "reception", "Test Receptionist", "receptionist"),
    ("viewer", "viewer", "Test Viewer", "readonly"),
];

pub fn seed_if_empty(conn: &Connection) -> Result<()> {
    let existing: i64 = conn.query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0))?;
    if existing > 0 {
        return Ok(());
    }

    let admin_id: String = conn
        .query_row("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1", [], |r| r.get(0))
        .map_err(|_| anyhow!("no admin user to seed as"))?;

    for (username, password, full_name, role) in USERS {
        if let Err(e) = auth::create_user(conn, username, password, full_name, role, &admin_id) {
            warn!("dev seed: user {username}: {e}");
        }
    }

    let investigations: Vec<String> = conn
        .prepare("SELECT id FROM investigations WHERE is_active = 1 ORDER BY test_code")?
        .query_map([], |r| r.get(0))?
        .collect::<std::result::Result<_, _>>()?;
    if investigations.len() < 6 {
        // Loud on purpose: this is what "only users were seeded" looks like.
        return Err(anyhow!(
            "dev seed needs at least 6 investigations but found {}. Call devseed::seed_if_empty AFTER seed::import_if_empty",
            investigations.len()
        ));
    }

    for (i, (name, gender, dob, phone)) in PATIENTS.iter().enumerate() {
        let patient = patients::create_patient(
            conn,
            patients::NewPatient {
                full_name: name.to_string(),
                date_of_birth: Some(dob.to_string()),
                age_override: None,
                gender: Some(gender.to_string()),
                phone: Some(phone.to_string()),
                address: Some("Demo address".into()),
                email: None,
                referring_physician: if i % 3 == 0 { Some("Dr. Demo".into()) } else { None },
                notes: None,
            },
            &admin_id,
        )
        .with_context(|| format!("dev seed: creating patient {name}"))?;

        // Two requests for the first few patients, one for the rest. Different tests each time.
        let request_count = if i < 3 { 2 } else { 1 };
        for r in 0..request_count {
            let start = (i * 5 + r * 11) % (investigations.len() - 5);
            let ids = investigations[start..start + 3 + (i + r) % 3].to_vec();

            let req = requests::create_request(
                conn,
                requests::NewRequest {
                    patient_id: patient.id.clone(),
                    investigation_ids: ids,
                    priority: if (i + r) % 4 == 0 { "urgent".into() } else { "normal".into() },
                    collection_date: None,
                    due_date: None,
                    notes: None,
                },
                &admin_id,
            )
            .with_context(|| format!("dev seed: creating request for {name}"))?;

            // Spread the requests over every state the UI has to handle.
            match (i + r) % 5 {
                0 => {}                                                    // pending, nothing entered
                1 => enter_results(conn, &req, gender, true, false, &admin_id)?,  // drafts only
                2 => finish(conn, &req, gender, i % 2 == 0, &admin_id)?,          // final, not invoiced
                3 => {
                    finish(conn, &req, gender, false, &admin_id)?;
                    invoice_and_pay(conn, &req.id, true, &admin_id)?;               // paid in full
                }
                _ => {
                    finish(conn, &req, gender, i % 2 == 1, &admin_id)?;
                    invoice_and_pay(conn, &req.id, false, &admin_id)?;              // partly paid
                }
            }
        }
    }

    let counts: Vec<String> = ["patients", "lab_requests", "results", "invoices", "payments"]
        .iter()
        .map(|t| {
            let n: i64 = conn.query_row(&format!("SELECT COUNT(*) FROM {t}"), [], |r| r.get(0)).unwrap_or(-1);
            format!("{t}={n}")
        })
        .collect();
    let msg = format!(
        "dev seed done: {} (logins: tech/tech, reception/reception, viewer/viewer)",
        counts.join(", ")
    );
    info!("{msg}");
    eprintln!("[devseed] {msg}"); // visible even if no tracing subscriber is installed
    Ok(())
}

/// Save a value for every item: normally inside the reference range, outside it when `abnormal`.
fn enter_results(
    conn: &Connection,
    req: &requests::RequestDetail,
    gender: &str,
    draft: bool,
    abnormal: bool,
    actor_id: &str,
) -> Result<()> {
    for (n, item) in req.items.iter().enumerate() {
        let range: Option<(Option<f64>, Option<f64>)> = conn
            .query_row(
                "SELECT min_value, max_value FROM reference_ranges
                 WHERE investigation_id = ?1 AND (gender = 'any' OR gender = ?2)
                 ORDER BY is_default DESC LIMIT 1",
                params![item.investigation_id, gender],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();
        let value = match range {
            Some((_, Some(hi))) if abnormal && n == 0 => hi * 1.4,
            Some((Some(lo), Some(hi))) => (lo + hi) / 2.0,
            _ => 10.0,
        };
        results::save_result(
            conn,
            results::SaveResult {
                request_item_id: item.id.clone(),
                numeric_value: Some(value),
                text_value: None,
                notes: None,
                is_draft: draft,
            },
            actor_id,
        )?;
    }
    Ok(())
}

fn finish(
    conn: &Connection,
    req: &requests::RequestDetail,
    gender: &str,
    abnormal: bool,
    actor_id: &str,
) -> Result<()> {
    enter_results(conn, req, gender, false, abnormal, actor_id)?;
    results::finalize_all_results(conn, &req.id, actor_id)
}

fn invoice_and_pay(conn: &Connection, request_id: &str, full: bool, actor_id: &str) -> Result<()> {
    let detail = billing::create_invoice(
        conn,
        billing::NewInvoice {
            request_id: request_id.to_string(),
            discount_type: "fixed".into(),
            discount_value: 0.0,
            tax_percent: 0.0,
            additional_fees: 0.0,
            notes: None,
        },
        actor_id,
    )?;
    let total = detail.invoice.total;
    billing::record_payment(
        conn,
        billing::NewPayment {
            invoice_id: detail.invoice.id,
            amount: if full { total } else { (total / 2.0).floor().max(1.0) },
            method: "cash".into(),
            reference_note: None,
        },
        actor_id,
    )?;
    Ok(())
}
