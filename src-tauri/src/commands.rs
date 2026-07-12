use crate::investigations::{
    self, Category, Investigation, NewInvestigation, NewReferenceRange, ReferenceRange,
};
use crate::patients::{self, DuplicateWarning, NewPatient, Patient};
use crate::profiles::{self, NewProfile, Profile, ProfileWithTests};
use crate::requests::{self, LabRequest, NewPatientWithRequest, NewRequest, RequestDetail};
use crate::results::{self, RequestResultsView, SaveResult};
use crate::{auth, AppState};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct ApiResult<T: Serialize> {
    pub ok: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> ApiResult<T> {
    pub fn ok(data: T) -> Self {
        Self { ok: true, data: Some(data), error: None }
    }
    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PrintData {
    pub results: RequestResultsView,
    pub settings: LabSettings,
}

// ── Auth ──────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn cmd_login(
    state: State<AppState>,
    username: String,
    password: String,
) -> ApiResult<auth::Session> {
    let conn = state.db.lock().unwrap();
    match auth::login(&conn, &username, &password) {
        Ok(session) => ApiResult::ok(session),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_logout(state: State<AppState>, session_id: String, user_id: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match auth::logout(&conn, &session_id, &user_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

// ── Settings ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct LabSettings {
    pub lab_name: String,
    pub lab_address: String,
    pub lab_phone: String,
    pub lab_email: String,
    pub theme: String,
    pub currency: String,
    pub date_format: String,
}

#[tauri::command]
pub fn cmd_get_settings(state: State<AppState>) -> ApiResult<LabSettings> {
    let conn = state.db.lock().unwrap();

    let get = |key: &str| -> String {
        conn.query_row("SELECT value FROM lab_settings WHERE key = ?1", [key], |r| {
            r.get::<_, Option<String>>(0)
        })
        .ok()
        .flatten()
        .unwrap_or_default()
    };

    ApiResult::ok(LabSettings {
        lab_name: get("lab_name"),
        lab_address: get("lab_address"),
        lab_phone: get("lab_phone"),
        lab_email: get("lab_email"),
        theme: get("theme"),
        currency: get("currency"),
        date_format: get("date_format"),
    })
}

#[tauri::command]
pub fn cmd_set_setting(state: State<AppState>, key: String, value: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match conn.execute(
        "INSERT INTO lab_settings (key, value, updated_at)
         VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
        params![key, value],
    ) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_user(
    state: State<AppState>,
    actor_id: String,
    username: String,
    password: String,
    full_name: String,
    role: String,
) -> ApiResult<auth::User> {
    let conn = state.db.lock().unwrap();
    match auth::create_user(&conn, &username, &password, &full_name, &role, &actor_id) {
        Ok(user) => ApiResult::ok(user),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_users(state: State<AppState>) -> ApiResult<Vec<auth::User>> {
    let conn = state.db.lock().unwrap();
    match auth::list_users(&conn) {
        Ok(users) => ApiResult::ok(users),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_set_user_active(
    state: State<AppState>,
    actor_id: String,
    target_id: String,
    active: bool,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match auth::set_user_active(&conn, &target_id, active, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_change_password(
    state: State<AppState>,
    user_id: String,
    old_password: String,
    new_password: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match auth::change_password(&conn, &user_id, &old_password, &new_password) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_patient(
    state: State<AppState>,
    patient: NewPatient,
    actor_id: String,
) -> ApiResult<Patient> {
    let conn = state.db.lock().unwrap();
    match patients::create_patient(&conn, patient, &actor_id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_update_patient(
    state: State<AppState>,
    actor_id: String,
    id: String,
    patient: NewPatient,
) -> ApiResult<Patient> {
    let conn = state.db.lock().unwrap();
    match patients::update_patient(&conn, &id, patient, &actor_id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_delete_patient(state: State<AppState>, actor_id: String, id: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match patients::delete_patient(&conn, &id, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_get_patient(state: State<AppState>, id: String) -> ApiResult<Patient> {
    let conn = state.db.lock().unwrap();
    match patients::get_patient(&conn, &id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_patients(
    state: State<AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> ApiResult<Vec<Patient>> {
    let conn = state.db.lock().unwrap();
    match patients::list_patients(&conn, limit.unwrap_or(50), offset.unwrap_or(0)) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_search_patients(
    state: State<AppState>,
    query: String,
    limit: Option<i64>,
) -> ApiResult<Vec<Patient>> {
    let conn = state.db.lock().unwrap();
    match patients::search_patients(&conn, &query, limit.unwrap_or(50)) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_check_patient_duplicates(
    state: State<AppState>,
    full_name: String,
    phone: Option<String>,
    dob: Option<String>,
) -> ApiResult<Vec<DuplicateWarning>> {
    let conn = state.db.lock().unwrap();
    match patients::check_dublicates(&conn, &full_name, phone.as_deref(), dob.as_deref()) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_categories(state: State<AppState>) -> ApiResult<Vec<Category>> {
    let conn = state.db.lock().unwrap();
    match investigations::list_categories(&conn) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_category(state: State<AppState>, name: String) -> ApiResult<Category> {
    let conn = state.db.lock().unwrap();
    match investigations::create_category(&conn, &name) {
        Ok(c) => ApiResult::ok(c),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_investigation(
    state: State<AppState>,
    actor_id: String,
    inv: NewInvestigation,
) -> ApiResult<Investigation> {
    let conn = state.db.lock().unwrap();
    match investigations::create_investigation(&conn, inv, &actor_id) {
        Ok(i) => ApiResult::ok(i),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_update_investigation(
    state: State<AppState>,
    actor_id: String,
    id: String,
    inv: NewInvestigation,
) -> ApiResult<Investigation> {
    let conn = state.db.lock().unwrap();
    match investigations::update_investigation(&conn, &id, inv, &actor_id) {
        Ok(i) => ApiResult::ok(i),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_set_investigation_active(
    state: State<AppState>,
    actor_id: String,
    id: String,
    active: bool,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match investigations::set_investigation_active(&conn, &id, active, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_delete_investigation(
    state: State<AppState>,
    actor_id: String,
    id: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match investigations::delete_investigation(&conn, &id, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_investigations(
    state: State<AppState>,
    category_id: Option<String>,
    search: Option<String>,
    inclue_inactive: Option<bool>,
) -> ApiResult<Vec<Investigation>> {
    let conn = state.db.lock().unwrap();
    match investigations::list_investigations(
        &conn,
        category_id.as_deref(),
        search.as_deref(),
        inclue_inactive.unwrap_or(false),
    ) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_reference_ranges(
    state: State<AppState>,
    investigation_id: String,
) -> ApiResult<Vec<ReferenceRange>> {
    let conn = state.db.lock().unwrap();
    match investigations::list_reference_ranges(&conn, &investigation_id) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_add_reference_range(
    state: State<AppState>,
    investigation_id: String,
    range: NewReferenceRange,
) -> ApiResult<ReferenceRange> {
    let conn = state.db.lock().unwrap();
    match investigations::add_reference_range(&conn, &investigation_id, range) {
        Ok(r) => ApiResult::ok(r),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_delete_reference_range(state: State<AppState>, id: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match investigations::delete_reference_range(&conn, &id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_profiles(state: State<AppState>) -> ApiResult<Vec<Profile>> {
    let conn = state.db.lock().unwrap();
    match profiles::list_profiles(&conn) {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_get_profile(state: State<AppState>, id: String) -> ApiResult<ProfileWithTests> {
    let conn = state.db.lock().unwrap();
    match profiles::get_profile(&conn, &id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_profile(
    state: State<AppState>,
    actor_id: String,
    profile: NewProfile,
) -> ApiResult<ProfileWithTests> {
    let conn = state.db.lock().unwrap();
    match profiles::create_profile(&conn, profile, &actor_id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_update_profile(
    state: State<AppState>,
    actor_id: String,
    id: String,
    profile: NewProfile,
) -> ApiResult<ProfileWithTests> {
    let conn = state.db.lock().unwrap();
    match profiles::update_profile(&conn, &id, profile, &actor_id) {
        Ok(p) => ApiResult::ok(p),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_set_profile_active(
    state: State<AppState>,
    actor_id: String,
    id: String,
    active: bool,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match profiles::set_profile_active(&conn, &id, active, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_delete_profile(state: State<AppState>, actor_id: String, id: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match profiles::delete_profile(&conn, &id, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_request(
    state: State<AppState>,
    actor_id: String,
    request: NewRequest,
) -> ApiResult<RequestDetail> {
    let conn = state.db.lock().unwrap();
    match requests::create_request(&conn, request, &actor_id) {
        Ok(r) => ApiResult::ok(r),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_create_patient_with_request(
    state: State<AppState>,
    actor_id: String,
    payload: NewPatientWithRequest,
) -> ApiResult<RequestDetail> {
    let conn = state.db.lock().unwrap();
    match requests::create_patient_with_request(&conn, payload, &actor_id) {
        Ok(r) => ApiResult::ok(r),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_get_request(state: State<AppState>, id: String) -> ApiResult<RequestDetail> {
    let conn = state.db.lock().unwrap();
    match requests::get_request(&conn, &id) {
        Ok(r) => ApiResult::ok(r),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_list_requests(
    state: State<AppState>,
    status: Option<String>,
    search: Option<String>,
    limit: Option<i64>,
) -> ApiResult<Vec<LabRequest>> {
    let conn = state.db.lock().unwrap();
    match requests::list_requests(&conn, status.as_deref(), search.as_deref(), limit.unwrap_or(100))
    {
        Ok(list) => ApiResult::ok(list),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_update_request_status(
    state: State<AppState>,
    actor_id: String,
    id: String,
    status: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match requests::update_request_status(&conn, &id, &status, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_update_item_status(
    state: State<AppState>,
    actor_id: String,
    item_id: String,
    status: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match requests::update_item_status(&conn, &item_id, &status, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_delete_request(state: State<AppState>, actor_id: String, id: String) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match requests::delete_request(&conn, &id, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_get_request_results(
    state: State<AppState>,
    request_id: String,
) -> ApiResult<RequestResultsView> {
    let conn = state.db.lock().unwrap();
    match results::get_request_results(&conn, &request_id) {
        Ok(r) => ApiResult::ok(r),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_save_result(
    state: State<AppState>,
    actor_id: String,
    entery: SaveResult,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match results::save_result(&conn, entery, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_finalize_results(
    state: State<AppState>,
    actor_id: String,
    request_id: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match results::finalize_all_results(&conn, &request_id, &actor_id) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_log_report(
    state: State<AppState>,
    actor_id: String,
    request_id: String,
) -> ApiResult<bool> {
    let conn = state.db.lock().unwrap();
    match conn.execute("INSERT INTO report_log (id, request_id, generated_by) VALUES (lower(hex(randomblob(16))), ?1, ?2)", params![request_id, actor_id]) {
        Ok(_) => ApiResult::ok(true),
        Err(e) => ApiResult::err(e.to_string()),
    }
}

#[tauri::command]
pub fn cmd_get_print_data(state: State<AppState>, request_id: String) -> ApiResult<PrintData> {
    let conn = state.db.lock().unwrap();

    let results = match results::get_request_results(&conn, &request_id) {
        Ok(r) => r,
        Err(e) => return ApiResult::err(e.to_string()),
    };

    let get = |key: &str| -> String {
        conn.query_row("SELECT value FROM lab_settings WHERE key=?1", [key], |r| {
            r.get::<_, Option<String>>(0)
        })
        .ok()
        .flatten()
        .unwrap_or_default()
    };

    let settings = LabSettings {
        lab_name: get("lab_name"),
        lab_address: get("lab_address"),
        lab_phone: get("lab_phone"),
        lab_email: get("lab_email"),
        theme: get("theme"),
        currency: get("currency"),
        date_format: get("date_format"),
    };

    ApiResult::ok(PrintData { results, settings })
}
