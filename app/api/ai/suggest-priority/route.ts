import { NextRequest, NextResponse } from "next/server"
import { suggestTaskPriority, LlmParseError } from "@/lib/core/ai"

/**
 * POST /api/ai/suggest-priority
 *
 * Use the LLM to suggest a priority level for a task based on its description.
 * This is advisory only — it does not modify any task in the database.
 *
 * Request body:
 *   - title (required): string — the task title
 *   - description (optional): string — additional context
 *
 * Response shape:
 *   { suggestion: { priority: "critical" | "high" | "medium" | "low", reasoning: string } }
 *
 * Error handling:
 *   - 400 if title is missing or empty
 *   - 503 if LLM service is unreachable
 *   - 502 if LLM response cannot be parsed as JSON
 *
 * Implementation steps:
 *   1. Validate title is present and non-empty
 *   2. Call chatCompletion with a system prompt containing "priority" or "urgency"
 *      and the title + description as user content
 *   3. Parse the JSON response
 *   4. Return the suggestion
 *
 * Hints:
 *   - Combine title and description: `${title}${description ? "\n" + description : ""}`
 *   - The mock LLM triggers priority suggestion when the system prompt contains
 *     "priority" or "urgency"
 *   - The mock LLM returns { priority, reasoning }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  let suggestion
  try {
    suggestion = await suggestTaskPriority(title, description)
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

  return NextResponse.json({ suggestion })
}