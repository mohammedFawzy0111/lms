# Refactor Requests page

- STATUS: OPEN
- PRIORITY: 70
- TAGS: page,ui,refactor

1075 lines: split into a folder of components. Remove the 31 inline styles. view-tabs and view-tab classes are used but never defined: define them or reuse the shared Tabs component. Use shared Modal, Field, StatusBadge, mini-table.
