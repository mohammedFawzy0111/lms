# Refactor Investigations page

- STATUS: OPEN
- PRIORITY: 20
- TAGS: page,ui,refactor

Split the 1068-line file into pages/investigations/ (IndividualTests, ProfilesView, InvestigationFormModal, ReferenceRangesModal, ProfileFormModal). Use shared Modal, Field and StatusBadge from components/ui. Replace profiles table with DataTable. Remove inline styles. Add useCallback deps to effects.
