# Save age_override when creating a patient

- STATUS: OPEN
- PRIORITY: 85
- TAGS: bug,backend

src-tauri/src/patients.rs create_patient: the INSERT omits age_override, so an estimated age typed on the New Patient form is dropped (only update_patient saves it). Add the column and parameter. Also check create_patient_with_request in requests.rs.
