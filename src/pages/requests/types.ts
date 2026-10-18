export interface LabRequest {
  id: string;
  request_no: string;
  patient_id: string;
  patient_name: string;
  patient_no: string;
  status: string;
  priority: string;
  request_date: string;
  collection_date: string | null;
  due_date: string | null;
  notes: string | null;
  item_count: number;
  created_at: string;
}

export interface RequestItem {
  id: string;
  request_id: string;
  investigation_id: string;
  test_code: string;
  test_name: string;
  status: string;
  price_at_order: number;
}

export interface PatientHit {
  id: string;
  patient_no: string;
  full_name: string;
}

export interface RequestDetail {
  id: string;
  request_no: string;
  patient: PatientHit;
  status: string;
  priority: string;
  request_date: string;
  collection_date: string | null;
  due_date: string | null;
  notes: string | null;
  items: RequestItem[];
}

/** A test that can be picked when creating a request. */
export interface TestOption {
  id: string;
  test_code: string;
  test_name: string;
  cost: number;
}

/** One row of cmd_list_profiles. */
export interface ProfileSummary {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  test_count: number;
}

/** A profile/panel plus the (active) tests it expands to. */
export interface ProfileOption {
  id: string;
  name: string;
  description: string | null;
  test_count: number;
  investigation_ids: string[];
}

export interface ReportLogEntry {
  id: string;
  generated_by: string | null;
  generated_by_name: string | null;
  generated_at: string;
}

export interface NewPatientForm {
  full_name: string;
  date_of_birth: string;
  age_override: number | null;
  gender: string;
  phone: string;
}

export const EMPTY_NEW_PATIENT: NewPatientForm = {
  full_name: "",
  date_of_birth: "",
  age_override: null,
  gender: "",
  phone: "",
};
