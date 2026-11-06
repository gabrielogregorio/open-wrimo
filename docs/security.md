# Security

## Supported versions

Only the latest release gets fixes.

## Reporting a vulnerability

Do not open a public issue. Use the private form in the Security tab of this repository, under "Report a
vulnerability". Include the version, the steps and the impact.

## What protects what

- **Passwords** are stored as scrypt hashes (N=16384, r=8, p=1, 16 byte salt), compared in constant time.
- **Access tokens** are JWTs signed with HS256 and `JWT_SECRET` (at least 32 characters), valid for 15 minutes, with
  issuer and audience checked on every request. They carry only the user id and the username.
- **Refresh tokens** are 32 random bytes, valid for 30 days, stored only as their SHA-256 with a TTL index. Each one
  works once: a refresh marks it used and issues the next one in the same family. A used token presented again after
  a 30 second grace window (left for parallel requests from the same browser) revokes the whole family, so a stolen
  token dies as soon as either side uses it. Signing out revokes the family.
- **Cookies** on the site are `httpOnly`, `SameSite=Lax` and `Secure` when `APP_URL` is https. The API never reads
  cookies; it takes `Authorization: Bearer`, so cross-site requests cannot use it with the visitor's session.
- **Sign in is rate limited** in MongoDB, so the limit holds across restarts and several app instances:
  5 tries per email in 15 minutes, 20 per address in 15 minutes, 200 per minute for the whole app. Sign up allows
  5 accounts per address per hour and 50 per minute in all. A successful sign in clears the email counter.
- **No user enumeration:** an unknown email still runs a password hash and gets the same message as a wrong password.
- **Authorization lives on the server.** `proxy.ts` renews tokens and redirects for comfort; every page, server action
  and API route checks the identity again, and every query filters by the writer, so another writer's id returns 404.
  Public profiles show only what the writer marked public, and only public novels.
- **Uploads:** the type is read from the file's first bytes, never from its name; SVG and anything else are refused.
  Files of 5 MB or more are refused before decoding, images over 40 megapixels are refused while decoding, every image
  is re-encoded as WebP (which drops metadata such as GPS) and must end under 2 MB. Two uploads per second per writer.
  Local files are served from `/media` with `nosniff` and keys checked against a strict pattern, so `../` cannot
  escape the uploads folder.
- **Rich text** from the editor passes through an allowlist (paragraphs, headings, lists, quotes, links, images) on
  save and again on render. Links get `rel="noopener noreferrer nofollow"` and images must come from `/media` or
  Cloudinary.
- **Input** goes through zod schemas with length limits before it reaches the database. Pages receive plain views
  built field by field, never the stored document.
- **Redirects** after sign in accept only local paths, never another host.
- **Headers:** `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` and HSTS on every route.

### Address used by the rate limit

Behind a reverse proxy you control, set `TRUST_PROXY=true` and the first `X-Forwarded-For` hop becomes the client
address. Without it the header is ignored, because anyone can forge it, and only the per-email and global limits apply.

## Accepted risks

Accepted by alert id, so a new alert on the same package still counts. Review date: 2027-05-01.

| Alert | Package | Severity | Why it is accepted |
| ----- | ------- | -------- | ------------------ |

## Dependency rules

- New versions wait 3 days before they can be installed (`minimumReleaseAge` and Dependabot `cooldown`).
- Every install is checked against the hashes in the lockfile (`pnpm install --frozen-lockfile`).
- Install scripts are blocked except for the packages listed in `pnpm-workspace.yaml`.
- Actions are pinned to a commit hash, and CI fails when one is not.
- The MongoDB image in `docker-compose.yml` is pinned by digest.
