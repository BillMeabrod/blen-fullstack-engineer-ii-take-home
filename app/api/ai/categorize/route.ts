import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tasks } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { categorizeTask, LlmParseError } from "@/lib/core/ai"

/**
 * POST /api/ai/categorize
 *
 * Use the LLM to automatically categorize a task into one of:
 *   bug, feature, improvement, documentation
 *
 * Request body:
 *   - taskId (required): string — UUID of the task to categorize
 *
 * Response shape:
 *   { task: Task, categorization: { category: string, confidence: number } }
 *
 * Error handling:
 *   - 400 if taskId is missing
 *   - 404 if task not found
 *   - 503 if LLM service is unreachable (catch errors from chatCompletion)
 *   - 502 if LLM response cannot be parsed as JSON
 *
 * Implementation steps:
 *   1. Validate taskId is present
 *   2. Fetch the task from the database
 *   3. Call chatCompletion with a system prompt containing "categorize" or "classify"
 *      and the task title + description as user content
 *   4. Parse the JSON response from the LLM
 *   5. Update the task's labels array to include the category
 *   6. Return the updated task and categorization
 *
 * Hints:
 *   - The mock LLM triggers categorization when the system prompt contains
 *     "categorize" or "classify"
 *   - Use `db.update(tasks).set({ labels: updatedLabels }).where(eq(tasks.id, taskId))`
 *   - Avoid duplicate labels: check if category is already in the array
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { taskId } = body

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 })
  }

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  let categorization
  try {
    categorization = await categorizeTask(task)
  } catch (err) {
    if (err instanceof LlmParseError) {
      return NextResponse.json(
        { error: "LLM returned an unparseable response" },
        { status: 502 }
      )
    }
    return NextResponse.json(
      { error: "LLM service is unavailable" },
      { status: 503 }
    )
  }

  const updatedLabels = task.labels?.includes(categorization.category)
    ? task.labels
    : [...(task.labels ?? []), categorization.category]

  const [updated] = await db
    .update(tasks)
    .set({ labels: updatedLabels, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()

  return NextResponse.json({ task: updated, categorization })
}