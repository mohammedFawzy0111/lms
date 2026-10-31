use anyhow::Result;
use rusqlite::{params, Connection};

fn clear(conn: &Connection, kind: &str, id: &str) -> Result<()> {
    conn.execute("DELETE FROM search_index WHERE kind = ?1 AND ref_id = ?2", params![kind, id])?;
    Ok(())
}

pub fn index_patient(conn: &Connection, id: &str) -> Result<()> {
    clear(conn, "patient", id)?;
    conn.execute(
        "INSERT INTO search_index (kind, ref_id, title, subtitle, body)
         SELECT 'patient', id, full_name,
                patient_no || COALESCE(' · ' || phone, ''),
                full_name || ' ' || patient_no || ' ' || COALESCE(phone, '')
         FROM patients WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn index_request(conn: &Connection, id: &str) -> Result<()> {
    clear(conn, "request", id)?;
    conn.execute(
        "INSERT INTO search_index (kind, ref_id, title, subtitle, body)
         SELECT 'request', r.id, r.request_no, p.full_name,
                r.request_no || ' ' || p.full_name || ' ' || p.patient_no || ' ' ||
                COALESCE((SELECT group_concat(i.test_name || ' ' || i.test_code, ' ')
                          FROM lab_request_items li
                          JOIN investigations i ON i.id = li.investigation_id
                          WHERE li.request_id = r.id), '')
         FROM lab_requests r JOIN patients p ON p.id = r.patient_id
         WHERE r.id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn index_invoice(conn: &Connection, id: &str) -> Result<()> {
    clear(conn, "invoice", id)?;
    conn.execute(
        "INSERT INTO search_index (kind, ref_id, title, subtitle, body)
         SELECT 'invoice', v.id, v.invoice_no, p.full_name,
                v.invoice_no || ' ' || p.full_name || ' ' ||
                COALESCE((SELECT group_concat(receipt_no, ' ')
                          FROM payments WHERE invoice_id = v.id), '')
         FROM invoices v
         JOIN lab_requests r ON r.id = v.request_id
         JOIN patients p ON p.id = r.patient_id
         WHERE v.id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn rebuild(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM search_index", [])?;
    for (kind, sql) in [
        ("patient", "SELECT id FROM patients"),
        ("request", "SELECT id FROM lab_requests"),
        ("invoice", "SELECT id FROM invoices"),
    ] {
        let ids: Vec<String> = conn
            .prepare(sql)?
            .query_map([], |r| r.get(0))?
            .collect::<std::result::Result<_, _>>()?;
        for id in ids {
            match kind {
                "patient" => index_patient(conn, &id)?,
                "request" => index_request(conn, &id)?,
                _ => index_invoice(conn, &id)?,
            }
        }
    }
    Ok(())
}

/// Turn user input into a safe FTS5 query: "inv-00 ahm" -> "\"inv-00\"* \"ahm\"*"
pub fn to_match(input: &str) -> Option<String> {
    let parts: Vec<String> = input
        .split_whitespace()
        .map(|w| format!("\"{}\"*", w.replace('"', "\"\"")))
        .collect();
    if parts.is_empty() {
        None
    } else {
        Some(parts.join(" "))
    }
}
