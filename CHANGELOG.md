# Changelog

## 0.2.1

- Images are stored in a folder per account (`<kind>/<userId>/<file>`), and deleting an account empties its folders,
  so every image stays tied to who uploaded it.
- `pnpm run images:owners` moves the images uploaded before 0.2.1 into their owner's folder; it only reports until it
  is run with `--apply`.
- Deleting an account also removes the old images added inside its texts, which had no upload record; an image
  another account uploaded or still shows is kept, so pasting someone else's image never deletes it.
- The delete my account button stays off until the confirmation box is ticked.

## 0.2.0

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
- JSON export of everything a writer logged.
- Brazilian Portuguese only; the reading shelf, posts and the dark and night themes were removed.
- Tools area with favorites and a local store: focus editor, word counter, sprint with text, don't stop, drafts
  with snapshots, goal calculator, year heatmap, pomodoro, reminder, manuscript, ePub and backup.
- Text review tools and story tools: names in 51 collections, characters, timeline, scenes, ideas from 16 genres
  and 116 tropes, and plot dice with 159 twists plus 38 rare ones.
- In-browser converter from docx, odt, md, txt and html to ePub, ready for Send to Kindle.
- Terms of Use and Privacy Policy with mandatory acceptance, access records, data export and account deletion
  with a grace period; every write, page and API call waits for the terms in force.
- Reports on public profiles and novels, an admin page to review them and a manual, previewed account deletion.
- Server code, the proxy, server actions and API routes are now in the 100% coverage, with tests that no writer
  reaches another writer's data.
- Animated page changes, labelled menu icons on small phones, more moods and profile pronouns.

## 0.1.0

- Shelf with spines, filters by status and paging.
- Books with title, author, pages, status, rating and notes; progress by page moves the status by itself.
- Bookmarks with page and note.
- Sign up and sign in with scrypt passwords, server sessions and a rate limit stored in MongoDB.
- English and Brazilian Portuguese, paper, dark and night (no blue light) themes.
- MongoDB through docker compose, or any cluster through `MONGODB_URI`.
- CI with lint, types, unit tests at 100% coverage, Playwright, axe, Lighthouse and a memory check.
