# Role-aware UI: hide what a role cannot use

- STATUS: OPEN
- PRIORITY: 88
- TAGS: ux,security

The backend now enforces roles (task 20261106-132136) but the UI still shows everything, so a technician clicks Billing and gets an error instead of a page.

1. Single source of truth: a small `can(role, permission)` helper (or `useCan()` hook) in src/lib that mirrors the groups in auth.rs (ANY, ADMIN, FRONT_DESK, LAB, STAFF). Keep the two lists next to a comment pointing at each other.
2. Nav (Shell/Sidebar): hide Users for non-admin, Billing for roles without FRONT_DESK, Settings write controls for non-admin.
3. Buttons: New Patient / Edit Patient / New Request / Record payment / Save result / Finalize / Delete ... only for roles that may call them; readonly gets a read-only look.
4. Dashboard: revenue and billing numbers only for roles allowed to read billing (the backend currently returns them to everyone).
5. Route guard: typing #/users as a non-admin should redirect to the dashboard with a short message.
6. Check with the seeded users tech/tech, reception/reception, viewer/viewer.
