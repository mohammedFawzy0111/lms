export interface Patient {
  id: string;
  patient_no: string;
  full_name: string;
  date_of_birth: string | null;
  age_override: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  referring_physician: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** What the backend accepts for create/update. */
export interface NewPatient {
  full_name: string;
  date_of_birth: string | null;
  age_override: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  referring_physician: string | null;
  notes: string | null;
}

export interface DuplicateWarning {
  patient_id: string;
  patient_no: string;
  full_name: string;
  matched_on: string;
}
