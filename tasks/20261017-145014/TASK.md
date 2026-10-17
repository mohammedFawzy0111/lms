# Bundle IBM Plex fonts locally

- STATUS: OPEN
- PRIORITY: 90
- TAGS: ui,polish

styles.css imports fonts from Google Fonts, which fails on an offline lab machine and falls back to system fonts. Install @fontsource/ibm-plex-sans and @fontsource/ibm-plex-mono and import them in main.tsx instead.
