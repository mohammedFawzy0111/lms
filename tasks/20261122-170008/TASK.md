# Arabic names and text

- STATUS: OPEN
- PRIORITY: 60
- TAGS: ux,i18n

A lab in Egypt will type Arabic patient names. Nothing has been verified.

1. Bundle an Arabic-capable font (IBM Plex Sans Arabic via @fontsource, `arabic-400/500/600.css`) so names do not fall back to a random system font in the app and on printed reports.
2. Inputs and table cells that hold names/addresses: dir="auto" so Arabic text aligns right while the UI stays LTR.
3. Search: unicode61 remove_diacritics does not unify Arabic letter variants. Normalise both the stored text and the query (alef forms أ إ آ -> ا, ى -> ي, ة -> ه optional, strip tashkeel and tatweel) in search.rs before indexing and in to_match().
4. Same normalisation for the LIKE searches in patients/requests/billing, or move them onto the search index.
5. Print a report with an Arabic name and check the header, the footer and long names that wrap.
