# Profile list pages with a large database

- STATUS: OPEN
- PRIORITY: 45
- TAGS: performance

The target machine is old (2 GB RAM, Intel G31). Nothing has been measured beyond the 10 demo patients.

1. Add a bulk mode to devseed.rs (e.g. env LMS_SEED=big): 5,000 patients, 15,000 requests, results and invoices for part of them.
2. Measure Patients, Requests, Billing, Results and the Dashboard on that data: time to first render, typing in search, scrolling.
3. Likely fixes: pagination or infinite scroll for Patients/Requests/Billing (patients has OFFSET paging in the backend already, the UI does not use it), `LIKE '%x%'` searches cannot use indexes (prefix search or the search index), an index on created_at / patients(created_at), fewer rows per page, memoised table rows, cheaper CSS (blur, shadows, animations) on WebKitGTK.
4. Note the numbers before and after in the task.
