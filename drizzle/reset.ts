import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { sql } from "drizzle-orm"
import postgres from "postgres"

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => {}, // silence NOTICE-level messages from CASCADE drops
})
const db = drizzle(client)

async function main() {
  console.log("Resetting database...")

  // Drop both schemas so this works on a fresh DB and after prior migrations.
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`)
  await db.execute(sql`CREATE SCHEMA public`)
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`)

  // Re-run migrations
  await migrate(db, { migrationsFolder: "./drizzle" })

  console.log("Database reset complete. Run 'bun run db:seed' to re-seed.")
  await client.end()
}

main().catch((err) => {
  console.error("Reset failed:", err)
  process.exit(1)
})
