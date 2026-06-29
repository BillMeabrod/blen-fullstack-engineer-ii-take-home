import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { validateProjectDeletion } from "@/lib/core/projects"

type RouteContext = { params: Promise<{ id: string }> }

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
 * GET /api/projects/:id
 *
 * Get a single project by ID, including its tasks and taskCounts by status.
 *
 * Response shape:
 *   {
 *     id, name, description, status, createdAt, updatedAt,
 *     tasks: Task[],
 *     taskCounts: { total, open, in_progress, in_review, completed }
 *   }
 *
 * Error handling:
 *   - 404 if project not found
 *
 * Hints:
 *   - Use `db.query.projects.findFirst` with `{ with: { tasks: true } }`
 *   - Compute taskCounts by filtering the tasks array in memory
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { tasks: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const taskCounts = {
    total: project.tasks.length,
    open: project.tasks.filter((t) => t.status === "open").length,
    in_progress: project.tasks.filter((t) => t.status === "in_progress").length,
    in_review: project.tasks.filter((t) => t.status === "in_review").length,
    completed: project.tasks.filter((t) => t.status === "completed").length,
  }

  return NextResponse.json({ ...project, taskCounts })
}

/**
 * PATCH /api/projects/:id
 *
 * Update a project's name, description, or status.
 *
 * Request body (all optional):
 *   - name: string
 *   - description: string
 *   - status: "active" | "completed" | "archived"
 *
 * Error handling:
 *   - 404 if project not found
 *   - 409 if updating name to one that already exists
 *
 * Hints:
 *   - Always set updatedAt to new Date()
 *   - Check for unique constraint violations on name
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = await request.json()

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const { name, description, status } = body

  try {
    const [updated] = await db
      .update(projects)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning()

    return NextResponse.json(updated)
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

/**
 * DELETE /api/projects/:id
 *
 * Delete a project. Blocked if tasks are in_progress or in_review.
 *
 * Error handling:
 *   - 404 if project not found
 *   - 409 if project has tasks in "in_progress" or "in_review" status
 *
 * Hints:
 *   - Count active tasks using `inArray(tasks.status, ["in_progress", "in_review"])`
 *   - Return 200 with success message on deletion
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { tasks: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    validateProjectDeletion(project.tasks)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cannot delete project" },
      { status: 409 }
    )
  }

  await db.delete(projects).where(eq(projects.id, id))

  return NextResponse.json({ message: "Project deleted successfully" })
}