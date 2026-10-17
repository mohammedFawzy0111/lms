# Investigations: reload keeps active category and search after save

- STATUS: OPEN
- PRIORITY: 15
- TAGS: bug,ui

onSaved calls loadItems(null, ""), so the table resets while the active CatTab stays highlighted. Keep the last args in a useRef inside loadItems and reload with them in onSaved.
