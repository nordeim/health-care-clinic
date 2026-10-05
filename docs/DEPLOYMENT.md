# Deployment Guide

The clinic site ships as a single Next.js **standalone** build with a
SQLite file database — one process, zero external services. This guide
covers the supported production path and the environment contract.

## 1. Build

```bash
bun install
bun run build          # next build + standalone assembly (.next/standalone)
```

The build prerenders the landing and legal pages, compiles the two API
route handlers (`/api/appointments`, `/api/health`), and copies
`.next/static` and `public/` into `.next/standalone/` (see the `build`
script in `package.json`). `next.config.ts` pins `outputFileTracingRoot`
to the repo root — keep it; the standalone trace depends on it.

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
- The `appointments` table is the only state; back it up by copying the
  file (SQLite single-writer: stop the server during the copy, or use
  `sqlite3 ... ".backup ..."`).

## 4. Health check

`GET /api/health` returns `200 {ok:true, database:"up"}` or `503` when
the database is unreachable — wire your uptime monitor to it.

## 5. Reverse proxy notes

- Forward `X-Forwarded-For` — the appointment rate limiter keys on it.
- Serve `/media/hero-video.mp4` (11 MB) with caching headers or from a
  CDN in front of the app.
- No cookies, no sessions, no websockets — nothing else to configure.

## 6. Verification before cutover

```bash
curl -s https://<host>/api/health
curl -s -X POST https://<host>/api/appointments \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test","phone":"555-000-0000","specialty":"Primary Care"}'
# expect 201 {"ok":true,"id":"..."}  (then delete the row if desired)
```
