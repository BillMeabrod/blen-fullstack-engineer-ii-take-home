import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects, tasks } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import type { ProjectStatus } from "@/lib/schema"

function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Error) {
    const cause = err.cause as { code?: string; message?: string } | undefined
    if (cause?.code === "23505") return true
    if (err.message.includes("unique") || err.message.includes("duplicate")) return true
    if (cause?.message?.includes("unique") || cause?.message?.includes("duplicate")) return true
  }
  return false
}

/**
 * GET /api/projects
 *
 * List all projects with optional status filter.
 * Each project includes a taskCount field.
 *
 * Query params:
 *   - status (optional): "active" | "completed" | "archived"
 *
 * Response: Array of projects, each with a `taskCount` number field.
 *
 * Hints:
 *   - Use a subquery or left join to count tasks per project
 *   - Use `sql<number>` with `coalesce` for null-safe counts
 *   - Filter by status using Drizzle's `eq()` when the param is present
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get("status") as ProjectStatus | null

  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      taskCount: sql<number>`coalesce(count(${tasks.id}), 0)::int`,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(status ? eq(projects.status, status) : undefined)
    .groupBy(projects.id)

  return NextResponse.json(result)
}

/**
 * POST /api/projects
 *
 * Create a new project.
 *
 * Request body:
 *   - name (required): string — must be unique
 *   - description (optional): string
 *
 * Response: 201 with the created project
 *
 * Error handling:
 *   - 400 if name is missing or empty
 *   - 409 if a project with this name already exists
 *
 * Hints:
 *   - Check for unique constraint violations (code 23505 or "unique"/"duplicate" in message)
 *   - Trim the name before inserting
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, description } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  try {
    const [project] = await db
      .insert(projects)
      .values({ name: name.trim(), description })
      .returning()

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return NextResponse.json(
        { error: "A project with this name already exists" },
        { status: 409 }
      )
    }
    throw err
  }
}