# Derive the acting user from the session, not from an actor_id sent by the frontend

- STATUS: OPEN
- PRIORITY: 60
- TAGS: backend,frontend,security

Commands like cmd_create_user, cmd_set_user_active, cmd_reset_password and cmd_change_password take actor_id / user_id from the frontend and require_admin() only checks that this id is an admin. Anyone who can call a command (devtools, a modified frontend) can claim to be an admin by sending an admin's id.

1. Make every command that needs an actor take session_id instead of actor_id. Add a helper in auth.rs, e.g. fn actor_from_session(conn, session_id) -> Result<User>, built on validate_session(), and use its user.id / user.role everywhere actor_id is used today (audit_log writes included).
2. require_admin() should then take the validated User (or the session id) rather than a raw id.
3. Do the same for the other write commands (patients, requests, results, billing, settings, backup/restore) and decide per command which roles may call them (admin, technician, receptionist, readonly: e.g. readonly must not write, receptionist must not enter results).
4. Frontend: send sessionId from authStore with each call (add it in lib/api.ts so call sites do not repeat it), and handle the "Session expired" error by logging out.
5. Remove actor_id parameters that are no longer needed.

Check: calling a write command with a made-up or expired session id fails; a readonly user cannot create a patient even by calling the command directly.
