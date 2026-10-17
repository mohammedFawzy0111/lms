# Populate the search_index FTS5 table

- STATUS: OPEN
- PRIORITY: 35
- TAGS: db

schema.sql creates search_index as a standalone FTS5 table but nothing fills it. Either insert/update/delete rows from the app code that writes patients, requests, invoices and payments, or add triggers. Also fill it for existing rows when needed.
