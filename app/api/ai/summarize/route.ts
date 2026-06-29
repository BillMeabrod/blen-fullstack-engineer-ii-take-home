import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { summarizeProject, LlmParseError } from "@/lib/core/ai"

/**
 * POST /api/ai/summarize
 *
 * Use the LLM to generate a summary of a project's tasks and assess health.
 *
 * Request body:
 *   - projectId (required): string — UUID of the project to summarize
 *
 * Response shape:
 *   {
 *     project: { id, name },
 *     summary: { summary: string, taskCount: number, health: "on_track" | "needs_attention" | "completed" }
 *   }
 *
 * Error handling:
 *   - 400 if projectId is missing
 *   - 404 if project not found
 *   - 503 if LLM service is unreachable
 *   - 502 if LLM response cannot be parsed as JSON
 *
 * Implementation steps:
 *   1. Validate projectId is present
 *   2. Fetch the project with its tasks using `db.query.projects.findFirst({ with: { tasks: true } })`
 *   3. Build a user message listing each task with status and priority
 *   4. Call chatCompletion with a system prompt containing "summarize" or "summary"
 *   5. Parse the JSON response
 *   6. Return project info and summary
 *
 * Hints:
 *   - Format each task as: `- ${title} [status: ${status}, priority: ${priority}]`
 *   - Handle empty task list: send "This project has no tasks yet."
 *   - The mock LLM returns { summary, taskCount, health } when triggered by "summarize"
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { tasks: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  let summary
  try {
    summary = await summarizeProject(project.tasks)
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

  return NextResponse.json({
    project: { id: project.id, name: project.name },
    summary,
  })
}