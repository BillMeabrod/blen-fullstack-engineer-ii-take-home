import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { validateStatusTransition } from "@/lib/core/tasks"
import type { TaskStatus } from "@/lib/schema"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/tasks/:id
 *
 * Get a single task by ID, including its parent project info.
 *
 * Response shape:
 *   { ...taskFields, project: { id, name } }
 *
 * Error handling:
 *   - 404 if task not found
 *
 * Hints:
 *   - Use `db.query.tasks.findFirst` with `{ with: { project: true } }`
 *   - Return project as `{ id, name }` only (not the full project object)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: { project: true },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    project: { id: task.project.id, name: task.project.name },
  })
}

/**
 * PATCH /api/tasks/:id
 *
 * Update a task's fields. Validates status transitions.
 *
 * Request body (all optional):
 *   - title, description, status, priority, assignee, dueDate, labels
 *
 * Error handling:
 *   - 404 if task not found
 *   - 400 if status transition is invalid (see VALID_STATUS_TRANSITIONS in lib/types.ts)
 *
 * Hints:
 *   - Only validate transitions when `body.status` differs from current. PATCH
 *     with the same status as current is idempotent — return 200 without
 *     consulting VALID_STATUS_TRANSITIONS (the map only encodes state changes).
 *   - Use VALID_STATUS_TRANSITIONS map to check allowed transitions
 *   - Always set updatedAt to new Date()
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = await request.json()

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (body.status) {
    try {
      validateStatusTransition(task.status, body.status as TaskStatus)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid status transition" },
        { status: 400 }
      )
    }
  }

  const { title, description, status, priority, assignee, dueDate, labels } = body

  const [updated] = await db
    .update(tasks)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(assignee !== undefined && { assignee }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(labels !== undefined && { labels }),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning()

  return NextResponse.json({
    ...updated,
    dueDate: updated.dueDate?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

/**
 * DELETE /api/tasks/:id
 *
 * Delete a task.
 *
 * Error handling:
 *   - 404 if task not found
 *
 * Hints:
 *   - Use `.returning()` to check if anything was deleted
 *   - Return 200 with success message
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  const [deleted] = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ message: "Task deleted successfully" })
}