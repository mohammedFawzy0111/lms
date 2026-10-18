import { calcAge } from "../patients/age";
import type { RequestResultsView } from "./types";

export function PatientBar({ data }: { data: RequestResultsView }) {
  const hasAge = data.patient_dob || data.patient_age != null;
  return (
    <div className="results-patient-bar">
      <span>
        Patient: <strong>{data.patient_name}</strong>
      </span>
      {data.patient_gender && (
        <span>
          Gender: <strong className="capitalize">{data.patient_gender}</strong>
        </span>
      )}
      {hasAge && (
        <span>
          Age: <strong>{calcAge({ date_of_birth: data.patient_dob, age_override: data.patient_age })}</strong>
        </span>
      )}
    </div>
  );
}
