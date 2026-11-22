# Replace window.confirm() with an in-app confirm dialog

- STATUS: OPEN
- PRIORITY: 50
- TAGS: ux

Patients, Profiles, IndividualTests and BackupCard use the browser confirm(). In a Tauri app confirm() may be replaced by the dialog plugin and then returns a Promise, which is truthy: `if (!confirm(...)) return;` would never stop a delete. First check in a built app whether Cancel really cancels.

1. Build a ConfirmDialog (on top of Modal) with title, message, confirm label, tone (danger for deletes) and a useConfirm() hook returning a promise.
2. Replace the four confirm() calls, and use it for the destructive ones that have no confirmation yet (delete request, restore backup already has one).
3. Focus the safe button (Cancel) by default, Esc cancels.
