mod auth;
mod billing;
mod commands;
mod db;
mod investigations;
mod patients;
mod profiles;
mod requests;
mod results;
mod seed;

use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // setting up the log file
    let log_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("lms-debug.log");
    let log_file = std::fs::File::create(&log_path).expect("Failed to create log file");

    tracing_subscriber::fmt()
        .with_writer(log_file)
        .with_ansi(false)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("debug")),
        )
        .init();
    tracing::info!("=== LMS starting, logging to {:?} ===", log_path);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("could not resolve app data directory");

            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("lms.db");

            let conn = db::open_and_migrate(&db_path).expect("failed to initialize the database");

            auth::seed_default_admin(&conn).expect("Faild to seed admin data");

            let resource_path = if cfg!(debug_assertions) {
                std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("seed/investigations.csv")
            } else {
                app.path()
                    .resolve("seed/investigations.csv", tauri::path::BaseDirectory::Resource)
                    .unwrap_or_else(|_| std::path::PathBuf::from("seed/investigations.csv"))
            };
            tracing::info!("Resoved seed CSV path: {:?}", resource_path);
            if let Err(e) = seed::import_if_empty(&conn, &resource_path) {
                tracing::warn!("Investiagation seed import failed: {}", e);
            }

            app.manage(AppState { db: Arc::new(Mutex::new(conn)) });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::cmd_login,
            commands::cmd_logout,
            commands::cmd_get_settings,
            commands::cmd_set_setting,
            commands::cmd_create_user,
            commands::cmd_list_users,
            commands::cmd_set_user_active,
            commands::cmd_change_password,
            commands::cmd_create_patient,
            commands::cmd_update_patient,
            commands::cmd_delete_patient,
            commands::cmd_get_patient,
            commands::cmd_search_patients,
            commands::cmd_list_patients,
            commands::cmd_check_patient_duplicates,
            commands::cmd_list_categories,
            commands::cmd_create_category,
            commands::cmd_create_investigation,
            commands::cmd_update_investigation,
            commands::cmd_set_investigation_active,
            commands::cmd_delete_investigation,
            commands::cmd_list_investigations,
            commands::cmd_list_reference_ranges,
            commands::cmd_add_reference_range,
            commands::cmd_delete_reference_range,
            commands::cmd_list_profiles,
            commands::cmd_get_profile,
            commands::cmd_create_profile,
            commands::cmd_update_profile,
            commands::cmd_set_profile_active,
            commands::cmd_delete_profile,
            commands::cmd_create_request,
            commands::cmd_create_patient_with_request,
            commands::cmd_get_request,
            commands::cmd_list_requests,
            commands::cmd_update_request_status,
            commands::cmd_update_item_status,
            commands::cmd_delete_request,
            commands::cmd_get_request_results,
            commands::cmd_save_result,
            commands::cmd_finalize_results,
            commands::cmd_log_report,
            commands::cmd_get_print_data,
            commands::cmd_list_report_log,
            commands::cmd_create_invoice,
            commands::cmd_update_invoice_adjustments,
            commands::cmd_get_invoice,
            commands::cmd_get_invoice_by_request,
            commands::cmd_list_invoices,
            commands::cmd_record_payment,
            commands::cmd_get_payment,
            commands::cmd_get_dashboard_stats,
            commands::cmd_get_recent_activity,
            commands::cmd_get_pending_results,
            commands::cmd_global_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
