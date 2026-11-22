# First login: replace the default admin/admin password

- STATUS: OPEN
- PRIORITY: 94
- TAGS: security,release

seed_default_admin() creates admin with password `admin`. Anyone who knows the product can log in on a fresh install.

1. Add `must_change_password INTEGER NOT NULL DEFAULT 0` to users (schema.sql; set to 1 for the seeded admin only).
2. login() returns the flag. Frontend: when it is set, show a blocking Change Password modal (no close button, no navigation) until the password is changed, then clear the flag in change_password().
3. Backend: authorize() should refuse every command except change_password, logout and validate_session while the flag is set, so the rule cannot be bypassed from the UI.
4. Reject the password `admin` (and very short ones) in change_password / reset_password / create_user; pick a minimum length (8) and say it in the form.
5. Optional: first-run wizard (lab name, currency, backup folder) shown right after the password change.
