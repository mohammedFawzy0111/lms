-- ============================================================================
-- LMS baseline schema (version 1)
-- Edit freely while the app is in development: debug builds wipe the DB on
-- start. Once released, treat this file as FROZEN and add changes as numbered
-- files under migrations/ registered in db.rs.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Core: users, sessions, audit, settings
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','technician','receptionist','readonly')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lab_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO lab_settings (key, value) VALUES
('lab_name',            'My Laboratory'),
('lab_address',         ''),
('lab_phone',           ''),
('lab_email',           ''),
('theme',               'dark'),
('currency',            'EGP'),
('date_format',         'YYYY-MM-DD'),
('print_mode',          'full'),
('print_margin_top',    '20'),
('print_margin_bottom', '20'),
('print_margin_left',   '15'),
('print_margin_right',  '15');

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------

CREATE TABLE patients (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  patient_no          TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  date_of_birth       TEXT,
  age_override        INTEGER,
  gender              TEXT CHECK (gender IN ('male', 'female')),
  phone               TEXT,
  address             TEXT,
  email               TEXT,
  referring_physician TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  created_by          TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_patients_name  ON patients (full_name COLLATE NOCASE);
CREATE INDEX idx_patients_phone ON patients (phone);
-- patient_no is UNIQUE, which already creates an index; no extra one needed.

CREATE TABLE patient_counter (
  id    INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO patient_counter (id, value) VALUES (1, 0);

-- ---------------------------------------------------------------------------
-- Investigations catalogue
-- ---------------------------------------------------------------------------

CREATE TABLE investigation_categories (
  id   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO investigation_categories (name) VALUES
('Hematology'),
('Biochemistry'),
('Immunology'),
('Serology'),
('Microbiology'),
('Endocrinology'),
('Pathology');

CREATE TABLE investigations (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  test_code     TEXT NOT NULL UNIQUE,
  test_name     TEXT NOT NULL,
  category_id   TEXT REFERENCES investigation_categories(id) ON DELETE SET NULL,
  description   TEXT,
  unit          TEXT,
  cost          REAL NOT NULL DEFAULT 0,
  result_type   TEXT NOT NULL DEFAULT 'numeric' CHECK (result_type IN ('numeric','text','multi_field')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  critical_low  REAL,
  critical_high REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_investigations_category ON investigations (category_id);
CREATE INDEX idx_investigations_active   ON investigations (is_active);

-- Reference ranges: age-group and gender aware
CREATE TABLE reference_ranges (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  age_group        TEXT NOT NULL CHECK (age_group IN ('neonate','infant','child','adolescent','adult','elderly')),
  gender           TEXT DEFAULT 'any' CHECK (gender IN ('male','female','any')),
  min_value        REAL,
  max_value        REAL,
  is_default       INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_refranges_investigation ON reference_ranges (investigation_id);

-- Profiles / panels (e.g. CBC, LFT)
CREATE TABLE profiles (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE profile_investigations (
  profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, investigation_id)
);

-- ---------------------------------------------------------------------------
-- Lab requests
-- ---------------------------------------------------------------------------

CREATE TABLE lab_requests (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_no      TEXT NOT NULL UNIQUE,
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','sample_collected','in_progress','completed','delivered','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  request_date    TEXT NOT NULL DEFAULT (datetime('now')),
  collection_date TEXT,
  due_date        TEXT,
  notes           TEXT,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_requests_patient ON lab_requests (patient_id);
CREATE INDEX idx_requests_status  ON lab_requests (status);
CREATE INDEX idx_requests_date    ON lab_requests (request_date);

CREATE TABLE lab_request_items (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_id       TEXT NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
  investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE RESTRICT,
  status           TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','sample_collected','in_progress','completed','delivered','cancelled')),
  price_at_order   REAL NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_request_items_request ON lab_request_items (request_id);
CREATE INDEX idx_request_items_inv     ON lab_request_items (investigation_id);

CREATE TABLE request_counter (
  id    INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO request_counter (id, value) VALUES (1, 0);

-- ---------------------------------------------------------------------------
-- Results & reports
-- ---------------------------------------------------------------------------

CREATE TABLE results (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_item_id TEXT NOT NULL UNIQUE REFERENCES lab_request_items(id) ON DELETE CASCADE,
  numeric_value   REAL,
  text_value      TEXT,
  flag            TEXT CHECK (flag IN ('normal','low','high','critical_low','critical_high')),
  is_draft        INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  entered_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  verified_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
  entered_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
-- request_item_id is UNIQUE, which already creates an index.

CREATE TABLE result_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id  TEXT NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  old_value  TEXT,
  new_value  TEXT,
  old_flag   TEXT,
  new_flag   TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE report_log (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_id   TEXT NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
  generated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  file_path    TEXT
);

CREATE INDEX idx_report_log_request ON report_log (request_id);

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_no      TEXT NOT NULL UNIQUE,
  request_id      TEXT NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
  subtotal        REAL NOT NULL DEFAULT 0,
  discount_type   TEXT DEFAULT 'fixed' CHECK (discount_type IN ('percent','fixed')),
  discount_value  REAL NOT NULL DEFAULT 0,
  tax_percent     REAL NOT NULL DEFAULT 0,
  additional_fees REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL DEFAULT 0,
  amount_paid     REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (status IN ('unpaid','partial','paid','cancelled')),
  notes           TEXT,
  created_by      TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_invoices_request ON invoices (request_id);
CREATE INDEX idx_invoices_status  ON invoices (status);

CREATE TABLE payments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_id     TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  receipt_no     TEXT NOT NULL UNIQUE,
  amount         REAL NOT NULL,
  method         TEXT NOT NULL CHECK (method IN ('cash','card','bank_transfer','other')),
  reference_note TEXT,
  received_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  paid_at        TEXT NOT NULL DEFAULT (datetime('now')),
  is_reprint_of  TEXT REFERENCES payments(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_invoice ON payments (invoice_id);

CREATE TABLE invoice_counter (
  id    INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO invoice_counter (id, value) VALUES (1, 0);

CREATE TABLE receipt_counter (
  id    INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO receipt_counter (id, value) VALUES (1, 0);

-- ---------------------------------------------------------------------------
-- Full-text search
-- FTS5 tables are virtual: they can't have CREATE INDEX statements (FTS5
  -- indexes every column itself). This is a standalone table, so the app must
-- insert/update/delete rows in it when the source data changes.
-- ---------------------------------------------------------------------------

CREATE VIRTUAL TABLE search_index USING fts5(
  kind UNINDEXED,
  ref_id UNINDEXED,
  title UNINDEXED,
  subtitle UNINDEXED,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
