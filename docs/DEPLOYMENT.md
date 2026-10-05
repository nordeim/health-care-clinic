# Deployment Guide

The clinic site ships as a single Next.js **standalone** build with a
SQLite file database — one process, zero external services. This guide
covers the supported production path and the environment contract.

## 1. Build

```bash
bun install
bun run build          # next build + standalone assembly (.next/standalone)
```

The build prerenders the landing, legal, and staff sign-in pages,
compiles the four API route handlers (`/api/appointments`,
`/api/auth/login`, `/api/auth/logout`, `/api/health`), and copies
`.next/static` and `public/` into `.next/standalone/` (see the `build`
script in `package.json`). `next.config.ts` pins `outputFileTracingRoot`
to the repo root — keep it; the standalone trace depends on it.
Note: `dev`/`build`/`db:*` scripts strip any ambient `DATABASE_URL`
(`env -u`) so the repo `.env` stays authoritative during builds; only the
`start` script (below) reads ambient env, which is the production
deliberate injection point.

## 2. Run

```bash
bun run start          # NODE_ENV=production bun .next/standalone/server.js
```

The server listens on port 3000 by default (`PORT` overrides). Always
start it from the repo root via the npm/bun script — the scripts
guarantee the working directory that the SQLite path resolution and the
standalone trace rely on.

## 3. Database contract

- **Production: use an ABSOLUTE `DATABASE_URL`.** Relative `file:` URLs
  resolve against the repo that owns `prisma/schema.prisma`
  (`src/lib/db-path.ts` implements the rule; `tests/db-path.test.ts`
  pins it). That is the right behavior for a checkout, but a deployed
  standalone copy should not depend on directory layout:

  ```bash
  DATABASE_URL="file:/srv/clinic/custom.db" bun .next/standalone/server.js
  ```

- Initialize the schema before the first start:
  `DATABASE_URL=<prod url> bun run db:push`.
- Seed the staff login before the first start (scrypt-hashed, upserted —
  re-run to rotate the password):

  ```bash
  DATABASE_URL=<prod url> ADMIN_EMAIL=you@example.com \
    ADMIN_PASSWORD='<strong password>' bun run db:seed
  ```

- The `appointments` and `admin_users` tables are the only state; back
  them up by copying the file (SQLite single-writer: stop the server during
  the copy, or use `sqlite3 ... ".backup ..."`).

## 4. Environment variables

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | yes | SQLite (or PostgreSQL) URL; ABSOLUTE in production |
| `AUTH_SECRET` | **yes (production)** | HMAC key for staff session cookies — `openssl rand -hex 32`; signing throws without it |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed-time | Consumed by `bun run db:seed` only (escape a leading `$` as `\$`) |
| `PORT` / `HOSTNAME` | no | Standalone server bind (default 3000 / localhost) |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical origin for metadata |

## 5. Health check

`GET /api/health` returns `200 {ok:true, database:"up"}` or `503` when
the database is unreachable — wire your uptime monitor to it.

## 6. Reverse proxy notes

- Forward `X-Forwarded-For` — the appointment AND login rate limiters key
  on it.
- Serve `/media/hero-video.mp4` (11 MB) with caching headers or from a
  CDN in front of the app.
- One cookie exists (`clinic_session`, httpOnly, SameSite=Lax, Secure in
  production): the staff dashboard session. The public site remains
  cookie-free.

## 7. Verification before cutover

```bash
curl -s https://<host>/api/health
curl -s -X POST https://<host>/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test","phone":"555-000-0000","specialty":"Primary Care"}'
# expect 201 {"ok":true,"id":"..."}  (then delete the row if desired)
```
