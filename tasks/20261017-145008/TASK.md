# Refactor Settings page

- STATUS: OPEN
- PRIORITY: 60
- TAGS: page,ui,refactor

553 lines, 31 inline styles. Classes card, card__header, form-grid and field--full are used but not defined anywhere: define them in Settings.css or a shared card component. Use shared Field.
