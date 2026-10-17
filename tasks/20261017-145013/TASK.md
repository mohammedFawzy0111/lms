# Replace remaining inline styles with classes

- STATUS: OPEN
- PRIORITY: 15
- TAGS: ui,refactor

About 138 style={{}} blocks were counted across pages. Move repeated ones into shared classes or page CSS as each page is refactored; track the count with: grep -c 'style={{' src/pages/*.tsx
