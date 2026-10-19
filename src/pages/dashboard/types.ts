/** Field names match the Rust `DashboardStats` struct exactly. */
export interface DashboardStats {
  today_patients: number;
  today_revenue: number;
  pending_investigation: number;
  completed_today: number;
  monthly_patients: number;
  monthly_revenue: number;
}

export interface RecentActivityEntry {
  action: string;
  entity_type: string | null;
  username: string | null;
  created_at: string;
}

/** One pending test; the backend returns one row per test. */
export interface PendingResultEntry {
  request_id: string;
  request_no: string;
  patient_name: string;
  test_name: string;
  priority: string;
}

/** Pending tests grouped under the request they belong to. */
export interface QueueItem {
  request_id: string;
  request_no: string;
  patient_name: string;
  urgent: boolean;
  tests: string[];
}
