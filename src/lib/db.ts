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
    // Dev query logging — accuracy note (session-14 F6): Prisma 6.11's
    // `['query']` events print the SQL TEMPLATE with `?` placeholders only;
    // bound parameter VALUES (patient names, phones, emails) are NOT
    // emitted. An earlier revision of this comment claimed values were
    // printed — verified false against dev.log (21 query lines, zero
    // bound values across live inserts/selects). Still dev-only, still
    // single-operator: keep not piping dev.log into shared systems
    // (defense in depth — raw/bypassing query layers would print values),
    // or narrow to ['error', 'warn'] if that ever changes.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
