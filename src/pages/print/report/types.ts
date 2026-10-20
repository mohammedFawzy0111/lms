export interface ReportResult {
  test_code: string;
  test_name: string;
  category_name: string | null;
  unit: string | null;
  numeric_value: number | null;
  text_value: string | null;
  flag: string | null;
  is_draft: boolean;
  ref_min: number | null;
  ref_max: number | null;
}

export interface ReportView {
  request_no: string;
  patient_name: string;
  patient_no: string;
  patient_dob: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  results: ReportResult[];
}

export interface ReportLab {
  lab_name: string;
  lab_address: string;
  lab_phone: string;
  lab_email: string;
}

/** Shape returned by cmd_get_print_data. */
export interface PrintData {
  results: ReportView;
  settings: ReportLab;
}

export type PrintMode = "full" | "template";

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
