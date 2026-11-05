# Security

## Supported versions

Only the latest release gets fixes.

## Reporting a vulnerability

Do not open a public issue. Use the private form in the Security tab of this repository, under "Report a
vulnerability". Include the version, the steps and the impact.

## What protects what

- **Passwords** are stored as scrypt hashes (N=16384, r=8, p=1, 16 byte salt), compared in constant time.
- **Sessions** use a random 32 byte token in an `httpOnly`, `SameSite=Lax` cookie, `Secure` when `APP_URL` is https.
  The database keeps only the SHA-256 of the token, with a TTL index that drops it after 30 days.
- **Sign in is rate limited** in MongoDB, so the limit holds across restarts and several app instances:
  5 tries per email in 15 minutes, 20 per address in 15 minutes, 200 per minute for the whole app. Sign up allows
  5 accounts per address per hour. A successful sign in clears the email counter.
- **No user enumeration:** an unknown email still runs a password hash and gets the same message as a wrong password.
- **Authorization lives on the server.** `proxy.ts` only redirects for comfort; every page and server action checks
  the session again, and every book query filters by the signed-in reader, so another reader's id returns 404.
- **Input** goes through zod schemas with length limits before it reaches the database. Pages receive plain views
  built field by field, never the stored document.
- **Redirects** after sign in accept only local paths (`/shelf…`), never another host.
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
