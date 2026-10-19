# Admin password reset and role checks for user management

- STATUS: OPEN
- PRIORITY: 70
- TAGS: backend,security

1. change_password (auth.rs) always needs the target user's CURRENT password, so an admin cannot reset a forgotten password from the Users page. Add an admin-only reset command (no old password) and a "Reset password" action for other users; keep the old-password flow for changing your own.
2. cmd_create_user, cmd_set_user_active and cmd_change_password trust whatever actor_id/user_id the frontend sends and never check the role. Check that the actor is an admin (and for change_password, that it is the user themselves) in Rust.
