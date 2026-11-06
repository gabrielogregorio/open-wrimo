# JSON API (`/api/v1`)

The site uses server actions; this API exists for scripts and other clients. Every body is JSON unless noted, and every error has the shape
`{ "error"?: string, "fieldErrors"?: { field: message } }`.

## Tokens

`register`, `login` and `refresh` return:

```json
{ "accessToken": "<JWT, 15 minutes>", "refreshToken": "<opaque, 30 days>", "expiresIn": 900 }
```

Send the access token as `Authorization: Bearer <accessToken>`. When a call returns 401, call `refresh` with the
refresh token and repeat the call with the new access token. Every refresh returns a new refresh token; keep only
the newest. Using an old refresh token again revokes the whole session.

| Method and path              | Body                                  | Success                           |
| ---------------------------- | ------------------------------------- | --------------------------------- |
| `POST /api/v1/auth/register` | `{ name, username, email, password }` | 201 with tokens                   |
| `POST /api/v1/auth/login`    | `{ email, password }`                 | 200 with tokens; 429 when limited |
| `POST /api/v1/auth/refresh`  | `{ refreshToken }`                    | 200 with new tokens, 401 if not   |
| `POST /api/v1/auth/logout`   | `{ refreshToken }`                    | 204, the session is revoked       |
| `GET /api/v1/me`             | none                                  | `{ id, name, email, username }`   |

`username` takes 3 to 20 lowercase letters, numbers and dashes. Passwords take 10 to 128 characters.

## Writing

| Method and path                    | Body                                                                                                                                                                                                             | Success             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `POST /api/v1/novels`              | multipart: `title`, `status`, `type`, `genres` (comma list), optional `summary`, `excerpt` (HTML), `pinterestUrl`, `playlistUrl`, `featured=on`, `isPublic=on`, `event`, `period` + `periodTarget`, file `cover` | 201 `{ id, cover }` |
| `POST /api/v1/novels/{id}/goals`   | `{ name, unit, target, startDate, endDate, period }`                                                                                                                                                             | 201 `{ id }`        |
| `POST /api/v1/goals/{id}/progress` | `{ mode: "add" \| "set", count, date, mood, place, source? }`                                                                                                                                                    | 201 `{ id, saved }` |
| `PUT /api/v1/profile`              | multipart: `name`, `username`, `isPublic=on`, `bio`, `location`, `writingTime`, `favoriteBooks`, `favoriteAuthors`, repeated `show` (`bio`, `stats`, `favorites`, `badges`), file `avatar`                       | 200 `{ saved }`     |

Values:

- `status`: `not-started`, `in-progress`, `completed`, `on-hiatus`
- `type`: `novel`, `novella`, `short-stories`, `nonfiction`, `memoir`, `poetry`, `script`, `other`
- `unit`: `words`, `hours`, `minutes`, `lines`, `pages`
- `period`: empty for a goal between `startDate` and `endDate`, or `daily`, `monthly`, `yearly`
- `event`: `november`, `april-camp`, `july-camp`
- `mood`: empty, `inspired`, `steady`, `tired`, `stuck`, `proud`
- Dates are `YYYY-MM-DD`. Counts go from 0 to 100000 per update.

Images (`cover`, `avatar`) must be PNG, JPEG, WebP or GIF under 5 MB. They are stored as WebP of at most 1920×1080
and must end under 2 MB. Each writer can send two images per second; the third one in the same second is refused.

## Other routes

- `GET /api/export` (cookie session): every novel, goal, entry and post of the signed-in writer as a JSON download.
- `POST /api/images` (cookie session): multipart `image`, used by the editor for inline images; returns `{ url }`.
- `GET /api/health`: `{ status: "ok" }`.
