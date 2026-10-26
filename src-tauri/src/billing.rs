use anyhow::{anyhow, Result};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use search;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub invoice_no: String,
    pub request_id: String,
    pub request_no: String,
    pub patient_name: String,
    pub patient_no: String,
    pub subtotal: f64,
    pub discount_type: String,
    pub discount_value: f64,
    pub tax_percent: f64,
    pub additional_fees: f64,
    pub total: f64,
    pub amount_paid: f64,
    pub balance: f64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceLineItem {
    pub test_code: String,
    pub test_name: String,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceDetail {
    pub invoice: Invoice,
    pub line_items: Vec<InvoiceLineItem>,
    pub payments: Vec<Payment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub receipt_no: String,
    pub amount: f64,
    pub method: String,
    pub reference_note: Option<String>,
    pub received_by_name: Option<String>,
    pub paid_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewInvoice {
    pub request_id: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub tax_percent: f64,
    pub additional_fees: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewPayment {
    pub invoice_id: String,
    pub amount: f64,
    pub method: String,
    pub reference_note: Option<String>,
}

fn next_invoice_no(conn: &Connection) -> Result<String> {
    conn.execute("UPDATE invoice_counter SET value = value + 1 WHERE id = 1", [])?;
    let value: i64 =
        conn.query_row("SELECT value FROM invoice_counter WHERE id = 1", [], |r| r.get(0))?;
    Ok(format!("INV-{:06}", value))
}

fn next_receipt_no(conn: &Connection) -> Result<String> {
    conn.execute("UPDATE receipt_counter SET value = value + 1 WHERE id = 1", [])?;
    let value: i64 =
        conn.query_row("SELECT value FROM receipt_counter WHERE id = 1", [], |r| r.get(0))?;
    Ok(format!("RCT-{:06}", value))
}

fn compute_total(
    subtotal: f64,
    discount_type: &str,
    discount_value: f64,
    tax_percent: f64,
    additional_fees: f64,
) -> f64 {
    let discount_amount = if discount_type == "percent" {
        subtotal * (discount_value / 100.0)
    } else {
        discount_value
    };
    let after_discount = (subtotal - discount_amount).max(0.0);
    let tax_amount = after_discount * (tax_percent / 100.0);
    after_discount + tax_amount + additional_fees
}

fn recompute_status(conn: &Connection, invoice_id: &str) -> Result<()> {
    let (total, amount_paid): (f64, f64) = conn.query_row(
        "SELECT total, amount_paid FROM invoices WHERE id = ?1",
        params![invoice_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;

    let status = if amount_paid <= 0.0 {
        "unpaid"
    } else if amount_paid >= total {
        "paid"
    } else {
        "partial"
    };

    conn.execute(
        "UPDATE invoices SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![status, invoice_id],
    )?;
    Ok(())
}

pub fn create_invoice(conn: &Connection, req: NewInvoice, actor_id: &str) -> Result<InvoiceDetail> {
    // Check invoice doesn't already exist for this request
    let existing: Option<String> = conn
        .query_row("SELECT id FROM invoices WHERE request_id = ?1", params![req.request_id], |r| {
            r.get(0)
        })
        .ok();
    if let Some(id) = existing {
        return get_invoice(conn, &id);
    }

    // Compute subtotal from request items
    let subtotal: f64 = conn.query_row(
        "SELECT COALESCE(SUM(price_at_order), 0) FROM lab_request_items WHERE request_id = ?1",
        params![req.request_id],
        |r| r.get(0),
    )?;

    let total = compute_total(
        subtotal,
        &req.discount_type,
        req.discount_value,
        req.tax_percent,
        req.additional_fees,
    );

    let id = uuid::Uuid::new_v4().to_string();
    let invoice_no = next_invoice_no(conn)?;

    conn.execute(
        "INSERT INTO invoices
            (id, invoice_no, request_id, subtotal, discount_type, discount_value,
             tax_percent, additional_fees, total, notes, created_by)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        params![
            id,
            invoice_no,
            req.request_id,
            subtotal,
            req.discount_type,
            req.discount_value,
            req.tax_percent,
            req.additional_fees,
            total,
            req.notes,
            actor_id
        ],
    )?;

    recompute_status(conn, &id)?;

    search::index_invoice(conn, &id)?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'invoice_created', 'invoice', ?2)",
        params![actor_id, id],
    );

    get_invoice(conn, &id)
}

pub fn update_invoice_adjustments(
    conn: &Connection,
    invoice_id: &str,
    discount_type: &str,
    discount_value: f64,
    tax_percent: f64,
    additional_fees: f64,
    actor_id: &str,
) -> Result<InvoiceDetail> {
    let subtotal: f64 = conn
        .query_row("SELECT subtotal FROM invoices WHERE id = ?1", params![invoice_id], |r| r.get(0))
        .map_err(|_| anyhow!("Invoice not found"))?;

    let total =
        compute_total(subtotal, discount_type, discount_value, tax_percent, additional_fees);

    conn.execute(
        "UPDATE invoices SET discount_type = ?1, discount_value = ?2, tax_percent = ?3,
            additional_fees = ?4, total = ?5, updated_at = datetime('now')
         WHERE id = ?6",
        params![discount_type, discount_value, tax_percent, additional_fees, total, invoice_id],
    )?;

    recompute_status(conn, invoice_id)?;

    search::index_invoice(conn, invoice_id)?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id)
         VALUES (?1, 'invoice_adjusted', 'invoice', ?2)",
        params![actor_id, invoice_id],
    );

    get_invoice(conn, invoice_id)
}

pub fn get_invoice(conn: &Connection, id: &str) -> Result<InvoiceDetail> {
    let invoice = conn.query_row(
        "SELECT inv.id, inv.invoice_no, inv.request_id, r.request_no, p.full_name, p.patient_no,
                inv.subtotal, inv.discount_type, inv.discount_value, inv.tax_percent,
                inv.additional_fees, inv.total, inv.amount_paid, inv.status, inv.notes, inv.created_at
         FROM invoices inv
         JOIN lab_requests r ON r.id = inv.request_id
         JOIN patients p ON p.id = r.patient_id
         WHERE inv.id = ?1",
        params![id],
        |row| {
            let total: f64 = row.get(11)?;
            let paid: f64 = row.get(12)?;
            Ok(Invoice {
                id:              row.get(0)?,
                invoice_no:      row.get(1)?,
                request_id:      row.get(2)?,
                request_no:      row.get(3)?,
                patient_name:    row.get(4)?,
                patient_no:      row.get(5)?,
                subtotal:        row.get(6)?,
                discount_type:   row.get(7)?,
                discount_value:  row.get(8)?,
                tax_percent:     row.get(9)?,
                additional_fees: row.get(10)?,
                total,
                amount_paid:     paid,
                balance:         (total - paid).max(0.0),
                status:          row.get(13)?,
                notes:           row.get(14)?,
                created_at:      row.get(15)?,
            })
        },
    ).map_err(|e| anyhow!("Invoice not found: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT i.test_code, i.test_name, ri.price_at_order
         FROM lab_request_items ri
         JOIN investigations i ON i.id = ri.investigation_id
         WHERE ri.request_id = ?1",
    )?;
    let line_items: Vec<InvoiceLineItem> = stmt
        .query_map(params![invoice.request_id], |row| {
            Ok(InvoiceLineItem {
                test_code: row.get(0)?,
                test_name: row.get(1)?,
                price: row.get(2)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut stmt2 = conn.prepare(
        "SELECT p.id, p.receipt_no, p.amount, p.method, p.reference_note, u.full_name, p.paid_at
         FROM payments p
         LEFT JOIN users u ON u.id = p.received_by
         WHERE p.invoice_id = ?1
         ORDER BY p.paid_at ASC",
    )?;
    let payments: Vec<Payment> = stmt2
        .query_map(params![id], |row| {
            Ok(Payment {
                id: row.get(0)?,
                receipt_no: row.get(1)?,
                amount: row.get(2)?,
                method: row.get(3)?,
                reference_note: row.get(4)?,
                received_by_name: row.get(5)?,
                paid_at: row.get(6)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(InvoiceDetail { invoice, line_items, payments })
}

pub fn get_invoice_by_request(conn: &Connection, request_id: &str) -> Result<Option<String>> {
    let id: Option<String> = conn
        .query_row("SELECT id FROM invoices WHERE request_id = ?1", params![request_id], |r| {
            r.get(0)
        })
        .ok();
    Ok(id)
}

pub fn list_invoices(
    conn: &Connection,
    status: Option<&str>,
    search: Option<&str>,
    limit: i64,
) -> Result<Vec<Invoice>> {
    let mut sql = "
        SELECT inv.id, inv.invoice_no, inv.request_id, r.request_no, p.full_name, p.patient_no,
               inv.subtotal, inv.discount_type, inv.discount_value, inv.tax_percent,
               inv.additional_fees, inv.total, inv.amount_paid, inv.status, inv.notes, inv.created_at
        FROM invoices inv
        JOIN lab_requests r ON r.id = inv.request_id
        JOIN patients p ON p.id = r.patient_id
        WHERE 1=1".to_string();

    if status.is_some() {
        sql.push_str(" AND inv.status = ?1");
    }
    if search.is_some() {
        let clause = if status.is_some() {
            " AND (p.full_name LIKE ?2 COLLATE NOCASE OR inv.invoice_no LIKE ?2 OR r.request_no LIKE ?2)"
        } else {
            " AND (p.full_name LIKE ?1 COLLATE NOCASE OR inv.invoice_no LIKE ?1 OR r.request_no LIKE ?1)"
        };
        sql.push_str(clause);
    }
    sql.push_str(&format!(" ORDER BY inv.created_at DESC LIMIT {}", limit));

    let mut stmt = conn.prepare(&sql)?;

    let mapper = |row: &rusqlite::Row| -> rusqlite::Result<Invoice> {
        let total: f64 = row.get(11)?;
        let paid: f64 = row.get(12)?;
        Ok(Invoice {
            id: row.get(0)?,
            invoice_no: row.get(1)?,
            request_id: row.get(2)?,
            request_no: row.get(3)?,
            patient_name: row.get(4)?,
            patient_no: row.get(5)?,
            subtotal: row.get(6)?,
            discount_type: row.get(7)?,
            discount_value: row.get(8)?,
            tax_percent: row.get(9)?,
            additional_fees: row.get(10)?,
            total,
            amount_paid: paid,
            balance: (total - paid).max(0.0),
            status: row.get(13)?,
            notes: row.get(14)?,
            created_at: row.get(15)?,
        })
    };

    let invoices: Vec<Invoice> = match (status, search) {
        (Some(s), Some(q)) => {
            let p = format!("%{}%", q.trim());
            stmt.query_map(params![s, p], mapper)?
        },
        (Some(s), None) => stmt.query_map(params![s], mapper)?,
        (None, Some(q)) => {
            let p = format!("%{}%", q.trim());
            stmt.query_map(params![p], mapper)?
        },
        (None, None) => stmt.query_map([], mapper)?,
    }
    .filter_map(|r| r.ok())
    .collect();

    Ok(invoices)
}

pub fn record_payment(conn: &Connection, req: NewPayment, actor_id: &str) -> Result<Payment> {
    let (total, amount_paid): (f64, f64) = conn
        .query_row(
            "SELECT total, amount_paid FROM invoices WHERE id = ?1",
            params![req.invoice_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| anyhow!("Invoice not found"))?;

    if req.amount <= 0.0 {
        return Err(anyhow!("Payment amount must be positive"));
    }
    if amount_paid + req.amount > total + 0.01 {
        return Err(anyhow!("Payment exceeds outstanding balance"));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let receipt_no = next_receipt_no(conn)?;

    conn.execute(
        "INSERT INTO payments (id, invoice_id, receipt_no, amount, method, reference_note, received_by)
         VALUES (?1,?2,?3,?4,?5,?6,?7)",
        params![id, req.invoice_id, receipt_no, req.amount, req.method, req.reference_note, actor_id],
    )?;

    conn.execute(
        "UPDATE invoices SET amount_paid = amount_paid + ?1, updated_at = datetime('now') WHERE id = ?2",
        params![req.amount, req.invoice_id],
    )?;

    recompute_status(conn, &req.invoice_id)?;

    let _ = conn.execute(
        "INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
         VALUES (?1, 'payment_recorded', 'invoice', ?2, ?3)",
        params![actor_id, req.invoice_id, format!("{} via {}", req.amount, req.method)],
    );

    let received_by_name: Option<String> = conn
        .query_row("SELECT full_name FROM users WHERE id = ?1", params![actor_id], |r| r.get(0))
        .ok();

    Ok(Payment {
        id,
        receipt_no,
        amount: req.amount,
        method: req.method,
        reference_note: req.reference_note,
        received_by_name,
        paid_at: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
    })
}

pub fn get_payment(conn: &Connection, payment_id: &str) -> Result<Payment> {
    conn.query_row(
        "SELECT p.id, p.receipt_no, p.amount, p.method, p.reference_note, u.full_name, p.paid_at
         FROM payments p LEFT JOIN users u ON u.id = p.received_by
         WHERE p.id = ?1",
        params![payment_id],
        |row| {
            Ok(Payment {
                id: row.get(0)?,
                receipt_no: row.get(1)?,
                amount: row.get(2)?,
                method: row.get(3)?,
                reference_note: row.get(4)?,
                received_by_name: row.get(5)?,
                paid_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| anyhow!("Payment not found: {}", e))
}
