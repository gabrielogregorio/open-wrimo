# Architecture and decisions

## The problem

Writers lose momentum between sessions: they forget how much they wrote, how far they are from the goal and whether
they kept the pace. Open Wrimo keeps one writer's novels, goals and every word count, turns them into numbers that
push the next session (today's target, streaks, projected finish date) and celebrates progress. The single-user
experience comes first; a public profile and a community page are opt-in.

## Stack

| Piece      | Choice                                      | Why                                                                                    |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Framework  | Next.js 16, App Router, server actions      | Pages and forms in one unit; server actions for the site, `/api/v1` for other clients  |
| Language   | TypeScript, strict                          | Shared types from the stored document to the form                                      |
| Styles     | Tailwind CSS 4 with CSS variables           | One paper theme defined as tokens in `globals.css`                                     |
| Database   | MongoDB 8 with the official driver          | Novels, goals and entries are plain documents; no ORM between the code and the queries |
| Auth       | JWT access tokens (jose) + refresh tokens   | Stateless checks on every request, revocable sessions through the refresh token family |
| Images     | sharp + a storage wrapper                   | Every upload becomes a WebP; local disk or Cloudinary behind the same two functions    |
| Editor     | Tiptap, sanitized with sanitize-html        | Rich text with images dropped inline; only an allowlist of tags reaches the database   |
| Validation | zod 4                                       | Error messages are i18n keys, so the same schema feeds the form and the translation    |
| Unit tests | Vitest with jsdom and mongodb-memory-server | Repositories run against a real `mongod`, not a mock                                   |
| E2E        | Playwright with axe                         | Runs on the production build with a throwaway database                                 |

## Layers

```
src/app          pages, layouts, server actions and /api/v1 route handlers (thin)
src/server       request helpers: current user, token cookies, writing context, API helpers
src/lib          domain and data: schemas, services, repositories, stats, badges, storage, auth, i18n
src/components   React components, client ones marked with 'use client'
```

Services receive their repositories, storage and rate limiter, so the rules (goal windows, set versus add, image
limits, ownership) are tested without Next.js. Server actions and API routes only add the identity and the response.

## Data

```
users        { email (unique), username (unique), name, passwordHash, createdAt }
sessions     { tokenHash (unique), userId, familyId, usedAt, createdAt, expiresAt (TTL) }   refresh tokens
rate_limits  { _id: key, count, expiresAt (TTL) }
profiles     { userId (unique), bio, location, writingTime, favoriteBooks, favoriteAuthors,
               avatarUrl, avatarKey, isPublic, shown: { bio, stats, favorites, badges } }
projects     { userId, title, status, type, genres[], summary, excerpt (sanitized HTML), pinterestUrl,
               playlistUrl, featured, isPublic, awards[], coverUrl, coverKey, createdAt, updatedAt }
goals        { userId, projectId, name, unit, target, startDate, endDate, period, eventId, createdAt }
entries      { userId, projectId, unit, date, count, mood, place, source, hour, createdAt }
```

Dates of goals and entries are calendar days (`YYYY-MM-DD`) in the writer's time zone, which the browser stores in a
cookie. A goal does not own entries: it counts the entries of its novel, in its unit, inside its window. A repeating
goal moves its window to today, this month or this year, so a daily goal renews by itself. "Set my new total" writes
the difference as an entry, which keeps the history additive and lets every update be undone.

## Stats and achievements

`src/lib/writing/stats.ts` turns entries into the numbers on the stats page: total, percent (shown past 100%), days
left, `needed today = (target - total at the start of the day) / days left including today`, daily par, average,
projected finish, streaks, best day, months and pace. `badges.ts` derives every automatic achievement from the same
data, so nothing is stored for them; personal badges are the only ones saved, on the novel. The browser remembers
which achievements and beaten goals it already celebrated and plays the new ones once.

## Sign in

Sign in and sign up return a pair: a JWT access token (HS256, 15 minutes, `sub` and `username`) and an opaque
refresh token (32 random bytes, 30 days, stored as SHA-256). Each refresh marks the token used and issues the next
one in the same family; a used token presented again after a 30 second grace window revokes the whole family. On the
site both live in `httpOnly` cookies and `proxy.ts` renews the access token before the page renders. The JSON API
takes `Authorization: Bearer` and refreshes through `/api/v1/auth/refresh`. Details in [security.md](security.md).

## Images

`src/lib/storage` has one interface, `save` and `remove`. The local driver writes under `LOCAL_UPLOADS_DIR` and the
`/media/[...key]` route serves the files, so it works with `next start` too. The Cloudinary driver signs uploads with
the API secret through plain `fetch`, without the SDK. Before any driver sees a file, `prepareImage` refuses uploads
of 5 MB or more, checks the real type by its first bytes, converts to WebP inside 1920×1080 and refuses results of
2 MB or more. A per-writer rate limit allows two uploads per second.

## Language and theme

- The interface is Brazilian Portuguese only. Texts are written in English in the code and translated through
  `src/lib/i18n/pt-BR.ts` and `pt-BR-writing.ts`, which keeps the code in English.
- There is one theme, paper. Book covers are a CSS 3D mockup that follows the pointer within -38° to -8°, so the
  back never shows.

## Local database or a cluster online

`MONGODB_URI` decides. The `.env.example` points to the container from `docker-compose.yml`. To use a cluster such as
MongoDB Atlas, put its `mongodb+srv://` string in `.env.local`; nothing else changes.

## Where it can grow

- Word sprints with friends and shared events, on top of the public profile and community page.
- Import of word counts from a document or another tracker.
- Reminders at the writer's usual writing time.
- A mobile client on the same `/api/v1`.
