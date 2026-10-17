# Fix CatTabs All tab showing empty list

- STATUS: CLOSED
- PRIORITY: 90
- TAGS: bug,ui

CatTabs uses an empty string for All, but Investigations stores it as activeCat and sends categoryId empty string to the backend. In IndividualTests use onSelect={(v) => setActiveCat(v || null)}. Optionally also treat an empty category_id as None in cmd_list_investigations.
