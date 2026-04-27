import { NextRequest, NextResponse } from "next/server"

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
  void request
  void context
  return NextResponse.json(
    { error: "GET /api/tasks/:id not implemented" },
    { status: 501 }
  )
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
  void request
  void context
  return NextResponse.json(
    { error: "PATCH /api/tasks/:id not implemented" },
    { status: 501 }
  )
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
  void request
  void context
  return NextResponse.json(
    { error: "DELETE /api/tasks/:id not implemented" },
    { status: 501 }
  )
}
