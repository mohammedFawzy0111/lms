# Freeze schema.sql at first release and start migrations

- STATUS: OPEN
- PRIORITY: 55
- TAGS: db,release

At the first real release treat schema.sql as frozen. From then on every change is a numbered file under migrations/ plus one line in the MIGRATIONS list in db.rs. Never edit released migrations.
