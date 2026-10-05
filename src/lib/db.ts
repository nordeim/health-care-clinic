import { PrismaClient } from '@prisma/client'
import { resolveProcessDatabaseUrl } from './db-path'

// ---------------------------------------------------------------------------
// SQLite URL resolution — the rule lives in src/lib/db-path.ts (pure, unit
// tested by tests/db-path.test.ts). Summary:
//
//   .env DATABASE_URL="file:../db/custom.db"
//     -> Prisma CLI (schema-relative):   <root>/db/custom.db
//     -> runtime (db-path.ts, same rule): <root>/db/custom.db
//
// Both resolve against the repo that owns prisma/schema.prisma, so `db:push`,
// `db:seed`, `next dev`, `next build` and the standalone server all open ONE
// database file at <repo>/db/custom.db regardless of the process working
// directory. Absolute file: URLs and non-SQLite URLs pass through untouched.
// ---------------------------------------------------------------------------

process.env.DATABASE_URL = resolveProcessDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Dev query logging prints BOUND PARAMETERS — patient names, phones,
    // emails — to the dev console (session-10 audit note). Dev-only and
    // single-operator by design; do not pipe dev.log into shared systems,
    // or narrow this to ['error', 'warn'] if it ever is.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
