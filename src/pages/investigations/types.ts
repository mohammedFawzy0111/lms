export interface Category {
  id: string;
  name: string;
}

export interface Investigation {
  id: string;
  test_code: string;
  test_name: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  unit: string | null;
  cost: number;
  result_type: string;
  is_active: boolean;
  critical_low: number | null;
  critical_high: number | null;
  created_at: string;
  updated_at: string;
}

export interface NewInvestigation {
  test_code: string;
  test_name: string;
  category_id: string | null;
  description: string | null;
  unit: string | null;
  cost: number;
  result_type: string;
  critical_low: number | null;
  critical_high: number | null;
}

export interface ReferenceRange {
  id: string;
  investigation_id: string;
  age_group: string;
  gender: string;
  min_value: number | null;
  max_value: number | null;
}

export interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  test_count: number;
}

export interface ProfileWithTests {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  investigation_ids: string[];
}

export interface NewProfile {
  name: string;
  description: string | null;
  investigation_ids: string[];
}

export const AGE_GROUPS = ["neonate", "infant", "child", "adolescent", "adult", "elderly"];
export const GENDERS = ["any", "male", "female"];
