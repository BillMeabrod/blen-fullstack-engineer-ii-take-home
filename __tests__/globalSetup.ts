import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../lib/schema"

export default async function globalSetup() {
  config()

  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema })

  await db.delete(schema.tasks)
  await db.delete(schema.projects)

  await client.end()
}