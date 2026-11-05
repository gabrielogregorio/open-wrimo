# Changelog

## 0.1.0

- Shelf with spines, filters by status and paging.
- Books with title, author, pages, status, rating and notes; progress by page moves the status by itself.
- Bookmarks with page and note.
- Sign up and sign in with scrypt passwords, server sessions and a rate limit stored in MongoDB.
- English and Brazilian Portuguese, paper, dark and night (no blue light) themes.
- MongoDB through docker compose, or any cluster through `MONGODB_URI`.
- CI with lint, types, unit tests at 100% coverage, Playwright, axe, Lighthouse and a memory check.
