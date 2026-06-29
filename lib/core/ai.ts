/**
 * Core — AI
 *
 * Owns all prompt construction, schema contracts, and LLM response parsing.
 * No HTTP concerns. No DB imports.
 * The route handlers call these functions and handle persistence.
 *
 * Caching strategy:
 *   - categorizeTask: cached on prompt inputs
 *   - suggestTaskPriority: cached on prompt inputs
 *   - summarizeProject: NOT cached — result depends on live task state which changes frequently
 */

import { chatCompletion } from "@/lib/llm"
import { TtlCache, cacheKey } from "@/lib/cache"
import { logger } from "@/lib/logger"
import type { Task } from "@/lib/schema"

export interface CategorizationResult {
  category: string
  confidence: number
}

export interface SummaryResult {
  summary: string
  taskCount: number
  health: "on_track" | "needs_attention" | "completed"
}

export interface PrioritySuggestion {
  priority: "critical" | "high" | "medium" | "low"
  reasoning: string
}

/**
 * Thrown when the LLM returns a response that cannot be parsed as JSON.
 * Route handlers catch this specifically to return 502 Bad Gateway.
 * All other errors from the LLM layer are treated as 503 Service Unavailable.
 */
export class LlmParseError extends Error {
  constructor(raw: string, cause?: unknown) {
    super(`Failed to parse LLM response: ${raw}`)
    this.name = "LlmParseError"
    this.cause = cause
  }
}

const CATEGORIZATION_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["bug", "feature", "improvement", "documentation"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
  required: ["category", "confidence"],
  additionalProperties: false,
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
    },
    taskCount: {
      type: "number",
      minimum: 0,
    },
    health: {
      type: "string",
      enum: ["on_track", "needs_attention", "completed"],
    },
  },
  required: ["summary", "taskCount", "health"],
  additionalProperties: false,
}

const PRIORITY_SCHEMA = {
  type: "object",
  properties: {
    priority: {
      type: "string",
      enum: ["critical", "high", "medium", "low"],
    },
    reasoning: {
      type: "string",
    },
  },
  required: ["priority", "reasoning"],
  additionalProperties: false,
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

const categorizationCache = new TtlCache<CategorizationResult>(SEVEN_DAYS_MS)
const priorityCache = new TtlCache<PrioritySuggestion>(ONE_HOUR_MS)

export async function categorizeTask(
  task: Pick<Task, "title" | "description">
): Promise<CategorizationResult> {
  const key = cacheKey("categorize", task.title, task.description ?? "")

  const cached = categorizationCache.get(key)
  if (cached) {
    logger.info("ai.cache_hit", { operation: "categorizeTask", key })
    return cached
  }

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a task categorization assistant. Categorize the following task into one of: bug, feature, improvement, documentation.",
      },
      {
        role: "user",
        content: `${task.title}${task.description ? "\n" + task.description : ""}`,
      },
    ],
    { schema: CATEGORIZATION_SCHEMA }
  )

  let result: CategorizationResult
  try {
    result = JSON.parse(response.content) as CategorizationResult
  } catch (err) {
    throw new LlmParseError(response.content, err)
  }

  categorizationCache.set(key, result)
  logger.info("ai.cache_set", { operation: "categorizeTask", key })

  return result
}

export async function summarizeProject(
  tasks: Pick<Task, "title" | "status" | "priority">[]
): Promise<SummaryResult> {
  const userContent =
    tasks.length === 0
      ? "This project has no tasks yet."
      : tasks
          .map(
            (t) =>
              `- ${t.title} [status: ${t.status}, priority: ${t.priority}]`
          )
          .join("\n")

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a project summarization assistant. Summarize the project status based on its tasks.",
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    { schema: SUMMARY_SCHEMA }
  )

  try {
    return JSON.parse(response.content) as SummaryResult
  } catch (err) {
    throw new LlmParseError(response.content, err)
  }
}

export async function suggestTaskPriority(
  title: string,
  description?: string
): Promise<PrioritySuggestion> {
  const key = cacheKey("priority", title, description ?? "")

  const cached = priorityCache.get(key)
  if (cached) {
    logger.info("ai.cache_hit", { operation: "suggestTaskPriority", key })
    return cached
  }

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a task priority assistant. Suggest a priority level for the following task.",
      },
      {
        role: "user",
        content: `${title}${description ? "\n" + description : ""}`,
      },
    ],
    { schema: PRIORITY_SCHEMA }
  )

  let result: PrioritySuggestion
  try {
    result = JSON.parse(response.content) as PrioritySuggestion
  } catch (err) {
    throw new LlmParseError(response.content, err)
  }

  priorityCache.set(key, result)
  logger.info("ai.cache_set", { operation: "suggestTaskPriority", key })

  return result
}