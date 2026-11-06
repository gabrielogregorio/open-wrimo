# Changelog

## Unreleased

- Renamed to Open Wrimo and turned into a writing app: novels, goals, word updates, stats, sprints and achievements.
- Novels with cover, status, type, genres, rich text details with inline images, links and privacy.
- Goals between dates or repeating daily, monthly and yearly, event shortcuts, percent past 100%, in-place editing.
- Updates that add or set the total on any day, picked from a 3D cover shelf, with a thousands mask and undo.
- Stats with rings, a pace chart, words by month and the pace of the last 7 and 30 days.
- Sprint timer and stopwatch with a soft alarm clock.
- Writing, lifetime, participation and personal achievements with sounds; confetti when a goal is beaten.
- Profile with picture, username and laurels, an optional public page at `/u/<username>`, and a community page.
- JWT access tokens with rotating refresh tokens, and a `/api/v1` JSON API.
- Image storage on the local disk or Cloudinary, with WebP conversion and size and rate limits.
- Mock writers seed through the API, and JSON export of everything a writer logged.
- Brazilian Portuguese only; the reading shelf, posts and the dark and night themes were removed.

## 0.1.0

- Shelf with spines, filters by status and paging.
- Books with title, author, pages, status, rating and notes; progress by page moves the status by itself.
- Bookmarks with page and note.
- Sign up and sign in with scrypt passwords, server sessions and a rate limit stored in MongoDB.
- English and Brazilian Portuguese, paper, dark and night (no blue light) themes.
- MongoDB through docker compose, or any cluster through `MONGODB_URI`.
- CI with lint, types, unit tests at 100% coverage, Playwright, axe, Lighthouse and a memory check.
