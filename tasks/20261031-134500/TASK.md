# Real sessions: expire, delete, and invalidate on logout, password change or reset, disable

- STATUS: CLOSED
- PRIORITY: 80
- TAGS: backend,frontend,security

Today a session is only a row in `sessions` that nothing ever checks. login() sets expires_at to 2099-01-01, logout() only sets is_active = 0, rows are never deleted, and the frontend trusts the session persisted in localStorage ("lms-auth") forever. No command verifies the session, so a stale or stolen session id keeps working and an admin cannot lock anyone out.

Backend (auth.rs):
1. login(): use a real expiry (e.g. datetime('now', '+8 hours')) instead of 2099. Delete expired rows (DELETE FROM sessions WHERE expires_at <= datetime('now') OR is_active = 0) at login and on startup.
2. logout(): DELETE the session row instead of setting is_active = 0.
3. change_password(): after the update, delete the user's other sessions (keep the current one if the caller passes its id, or delete all and force re-login).
4. reset_password(): delete ALL sessions of the target user.
5. set_user_active(false): delete all sessions of that user. Also on role change if that command exists, and on user delete (already cascades).
6. Add validate_session(conn, session_id) -> Result<User>: row exists, is_active = 1, not expired, user is_active = 1. Return the current user (role comes from the DB, not the frontend). Expose it as cmd_validate_session.
7. Optional: sliding expiry (extend expires_at on validate), and an idle timeout.

Frontend:
8. On app start (App.tsx / authStore) call cmd_validate_session with the persisted session id. If it fails, clear the session and show Login.
9. Re-validate periodically (e.g. every minute) and when the window regains focus. Handle the "session invalid" error from any api() call by logging out. If the logged-in admin resets or changes their own password, log them out locally too.
10. Never trust the role stored in localStorage for anything but UI hints; role checks for the real protection belong in Rust (see task 20261019-110000, ideally via the validated session).

Check: log in, reset that user's password from another admin, and the first window must drop to the Login page within a minute. Disabling a user must do the same. Closing and reopening the app after expiry must show Login.
