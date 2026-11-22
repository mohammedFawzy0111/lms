# Keep search_index in sync on patient rename and delete

- STATUS: OPEN
- PRIORITY: 35
- TAGS: search,bug

index_patient runs on create/update, but a patient's name is also part of their request and invoice rows, and deleting a patient cascades to requests/invoices while only the patient row leaves search_index. The startup rebuild repairs it, a running app shows stale hits.

1. update_patient: after the update re-index the patient's requests and invoices (index_request / index_invoice per row).
2. delete_patient / delete_request: delete the matching search_index rows for the cascaded requests and invoices (collect their ids before deleting).
3. Wrap rebuild() in a transaction (it runs on every start).
