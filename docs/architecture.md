# Architecture and decisions

## The problem

Readers lose track of what they are reading, where they stopped and which passages they wanted to keep. Open Wrimo is a
private reading log: a shelf of books with a status, the current page and bookmarks with notes. It stays small on
purpose so it can grow in the directions listed at the end.

## Stack

| Piece      | Choice                                      | Why                                                                                           |
| ---------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16, App Router, server actions      | One deployable unit; forms work through server actions with no API layer to keep in sync      |
| Language   | TypeScript, strict                          | Shared types from the database document to the form                                           |
| Styles     | Tailwind CSS 4 with CSS variables           | Theme tokens live in `globals.css`; utilities read them, so a theme is one block of variables |
| Fonts      | Literata and Fraunces, self hosted          | Literata was drawn for long reading on screens; no request leaves the app                     |
| Database   | MongoDB 8 with the official driver          | A book with its bookmarks is one document; no ORM to hide the queries                         |
| Validation | zod 4                                       | Error messages are i18n keys, so the same schema feeds the form and the translation           |
| Unit tests | Vitest with jsdom and mongodb-memory-server | Repositories run against a real `mongod`, not a mock                                          |
| E2E        | Playwright with axe                         | Runs on the production build with a throwaway database                                        |

## Layers

```
src/app          routes, layouts and server actions (thin: session, call, revalidate, redirect)
src/server       request helpers: current user, locale, wiring of repositories
src/lib          domain and data: schemas, services, repositories, rate limit, i18n
src/components   React components, client ones marked with 'use client'
```

Services receive their repositories, so the rules (status from progress, limits, ownership) are tested without
Next.js. Server actions only add the session and the navigation.

## Data

```
users        { email (unique), name, passwordHash, createdAt }
sessions     { tokenHash (unique), userId, createdAt, expiresAt (TTL) }
rate_limits  { _id: key, count, expiresAt (TTL) }
books        { userId, title, author, totalPages, currentPage, status, rating, notes,
               bookmarks: [{ id, page, note, createdAt }], createdAt, updatedAt }
```

Indexes are created on the first connection (`src/lib/db/collections.ts`). The shelf query uses
`{ userId, status, updatedAt }` and pages 48 books at a time.

## Sign in and rate limit

The limiter is one atomic `findOneAndUpdate` with an update pipeline: inside the window it adds one, after it starts a
new window. Parallel attempts cannot pass the limit, which a unit test checks with ten concurrent calls. Rules are in
`src/lib/auth/rate-limit.ts` and explained in [security.md](security.md).

## Language and theme

- The interface text is English and doubles as the key; `src/lib/i18n/pt-BR.ts` holds the Portuguese. A test scans
  every `t('…')` call and every validation message and fails when one has no translation.
- Locale order: `?lang=`, then the saved cookie, then the browser, then English.
- There is one theme, paper. Its colors are CSS variables in `globals.css`, read by the Tailwind utilities.

## Local database or a cluster online

`MONGODB_URI` decides. The `.env.example` points to the container from `docker-compose.yml`. To use a cluster such as
MongoDB Atlas, put its `mongodb+srv://` string in `.env.local`; nothing else changes. The app validates the variable on
the first request and refuses anything that is not a MongoDB connection string.

## Where it can grow

- Look up a book by ISBN to fill title, author and page count.
- Reading goals per year and a calendar of reading days.
- Quotes as a kind of bookmark, with search across books.
- Export and import of the shelf as JSON or CSV.
- Shelves shared with friends, with the ownership checks already in every query.
