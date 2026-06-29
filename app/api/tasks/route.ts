import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tasks, projects } from "@/lib/schema"
import { eq, and, count, type SQL } from "drizzle-orm"
import type { TaskStatus, TaskPriority, Task } from "@/lib/schema"
import type { PaginatedResponse } from "@/lib/types"

const PAGE_SIZE_MAX = 50
const PAGE_SIZE_DEFAULT = 10

/**
 * GET /api/tasks
 *
 * List tasks with filtering and pagination.
 *
 * Query params:
 *   - projectId (optional): filter by project
 *   - status (optional): "open" | "in_progress" | "in_review" | "completed"
 *   - priority (optional): "low" | "medium" | "high" | "critical"
 *   - assignee (optional): filter by assignee name
 *   - page (optional, default 1): page number
 *   - pageSize (optional, default 10, max 50): items per page
 *
 * Response shape (PaginatedResponse):
 *   {
 *     data: Task[],
 *     pagination: { page, pageSize, total, totalPages }
 *   }
 *
 * Hints:
 *   - Build conditions array with `SQL[]` and combine using `and(...conditions)`
 *   - Use separate queries for count and data (with limit/offset)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const status = searchParams.get("status") as TaskStatus | null
  const priority = searchParams.get("priority") as TaskPriority | null
  const assignee = searchParams.get("assignee")
  const projectId = searchParams.get("projectId")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10))
  )

  const conditions: SQL[] = []
  if (status) conditions.push(eq(tasks.status, status))
  if (priority) conditions.push(eq(tasks.priority, priority))
  if (assignee) conditions.push(eq(tasks.assignee, assignee))
  if (projectId) conditions.push(eq(tasks.projectId, projectId))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(tasks)
    .where(where)

  const data = await db
    .select()
    .from(tasks)
    .where(where)
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const response: PaginatedResponse<Task> = {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }

  return NextResponse.json(response)
}

/**
 * POST /api/tasks
 *
 * Create a new task.
 *
 * Request body:
 *   - title (required): string
 *   - projectId (required): string — must reference an existing project
 *   - description (optional): string
 *   - priority (optional): "low" | "medium" | "high" | "critical"
 *   - assignee (optional): string
 *   - dueDate (optional): ISO date string
 *   - labels (optional): string[]
 *
 * Response: 201 with the created task
 *
 * Error handling:
 *   - 400 if title is missing or empty
 *   - 400 if projectId is missing
 *   - 400 if projectId references a non-existent project
 *
 * Hints:
 *   - Verify project exists before inserting
 *   - Defaults: status="open", priority="medium"
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, projectId, description, priority, assignee, dueDate, labels } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })

  if (!project) {
    return NextResponse.json(
      { error: "projectId references a non-existent project" },
      { status: 400 }
    )
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title: title.trim(),
      projectId,
      description,
      priority,
      assignee,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      labels,
    })
    .returning()

  return NextResponse.json(task, { status: 201 })
}