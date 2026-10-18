export interface TestResult {
  id: string;
  request_item_id: string;
  test_code: string;
  test_name: string;
  unit: string | null;
  numeric_value: number | null;
  text_value: string | null;
  flag: string | null;
  is_draft: boolean;
  notes: string | null;
  entered_by: string | null;
  entered_at: string;
  updated_at: string;
  ref_min: number | null;
  ref_max: number | null;
  ref_age_group: string | null;
  ref_gender: string | null;
}

export interface RequestResultsView {
  request_id: string;
  request_no: string;
  patient_id: string;
  patient_name: string;
  patient_no: string;
  patient_dob: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  results: TestResult[];
}

/** What the user has typed for one test; strings so inputs stay controlled. */
export interface Edit {
  numeric_value: string;
  text_value: string;
  notes: string;
}

export const EMPTY_EDIT: Edit = { numeric_value: "", text_value: "", notes: "" };

/** A result row that was saved as final is locked. */
export const isFinal = (r: TestResult) => !r.is_draft && !!r.id;

/** Numeric tests (they have a unit) take a number, the rest pick from a list. */
export const isNumeric = (r: TestResult) => !!r.unit;

export function hasValue(r: TestResult, e: Edit): boolean {
  return (isNumeric(r) ? e.numeric_value : e.text_value).trim() !== "";
}

export function editFromResult(r: TestResult): Edit {
  return {
    numeric_value: r.numeric_value != null ? String(r.numeric_value) : "",
    text_value: r.text_value ?? "",
    notes: r.notes ?? "",
  };
}

/** Payload for cmd_save_result. */
export function toEntry(r: TestResult, e: Edit, isDraft: boolean) {
  const n = parseFloat(e.numeric_value);
  return {
    request_item_id: r.request_item_id,
    numeric_value: e.numeric_value.trim() === "" || isNaN(n) ? null : n,
    text_value: e.text_value || null,
    notes: e.notes.trim() || null,
    is_draft: isDraft,
  };
}
