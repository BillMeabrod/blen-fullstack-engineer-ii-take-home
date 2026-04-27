import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../../lib/schema"
import { projects, tasks, type Task } from "../../lib/schema"
import { createTestRequest, parseResponse } from "../helpers/request"

jest.mock("@/lib/llm", () => {
  const actual = jest.requireActual<typeof import("@/lib/llm")>("@/lib/llm")
  return {
    ...actual,
    chatCompletion: jest.fn(actual.chatCompletion),
  }
})

import { POST as CATEGORIZE } from "@/app/api/ai/categorize/route"
import { POST as SUMMARIZE } from "@/app/api/ai/summarize/route"
import { POST as SUGGEST_PRIORITY } from "@/app/api/ai/suggest-priority/route"
import * as llm from "@/lib/llm"

const mockChatCompletion = llm.chatCompletion as jest.MockedFunction<
  typeof llm.chatCompletion
>
const realLlm = jest.requireActual<typeof import("@/lib/llm")>("@/lib/llm")

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

type CategorizeResponse = {
  task: Task
  categorization: { category: string; confidence: number }
}

type SummarizeResponse = {
  project: { id: string; name: string }
  summary: {
    summary: string
    taskCount: number
    health: "on_track" | "needs_attention" | "completed"
  }
}

type SuggestPriorityResponse = {
  suggestion: { priority: string; reasoning: string }
}

let projectId: string

beforeEach(async () => {
  // Default: delegate to the real lib/llm implementation. Tests that need
  // to simulate LLM errors override per-call with mockRejectedValueOnce /
  // mockResolvedValueOnce.
  mockChatCompletion.mockReset()
  mockChatCompletion.mockImplementation(realLlm.chatCompletion)

  await db.delete(tasks)
  await db.delete(projects)

  const [project] = await db
    .insert(projects)
    .values({ name: "AI Test Project", description: "For AI endpoint tests" })
    .returning()
  projectId = project.id
})

afterAll(async () => {
  await db.delete(tasks)
  await db.delete(projects)
  await client.end()
})

// ---------------------------------------------------------------------------
// POST /api/ai/categorize
// ---------------------------------------------------------------------------

describe("POST /api/ai/categorize", () => {
  it("categorizes a bug-related task", async () => {
    const [task] = await db
      .insert(tasks)
      .values({
        title: "Fix login crash on mobile",
        description: "The app crashes when users try to log in on iOS",
        projectId,
      })
      .returning()

    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: task.id },
    })
    const res = await CATEGORIZE(req)
    const { status, data } = await parseResponse<CategorizeResponse>(res)

    expect(status).toBe(200)
    expect(data.categorization).toBeDefined()
    expect(data.categorization.category).toBe("bug")
    expect(typeof data.categorization.confidence).toBe("number")

    // Verify the task's labels were updated in the database
    const updated = await db.query.tasks.findFirst({
      where: (t, { eq }) => eq(t.id, task.id),
    })
    expect(updated!.labels).toContain("bug")
  })

  it("categorizes a feature-related task", async () => {
    const [task] = await db
      .insert(tasks)
      .values({
        title: "Add dark mode support",
        description: "Implement a new dark theme toggle in settings",
        projectId,
      })
      .returning()

    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: task.id },
    })
    const res = await CATEGORIZE(req)
    const { status, data } = await parseResponse<CategorizeResponse>(res)

    expect(status).toBe(200)
    expect(data.categorization.category).toBe("feature")
  })

  it("categorizes a documentation task", async () => {
    const [task] = await db
      .insert(tasks)
      .values({
        title: "Write API documentation for endpoints",
        description: "Document all REST endpoints in the README guide",
        projectId,
      })
      .returning()

    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: task.id },
    })
    const res = await CATEGORIZE(req)
    const { data } = await parseResponse<CategorizeResponse>(res)

    expect(data.categorization.category).toBe("documentation")
  })

  it("returns 400 when taskId is missing", async () => {
    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: {},
    })
    const res = await CATEGORIZE(req)

    expect(res.status).toBe(400)
  })

  it("returns 404 when task does not exist", async () => {
    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: "00000000-0000-0000-0000-000000000000" },
    })
    const res = await CATEGORIZE(req)

    expect(res.status).toBe(404)
  })

  it("returns 503 when the LLM service is unreachable", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Some task", projectId })
      .returning()

    mockChatCompletion.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: task.id },
    })
    const res = await CATEGORIZE(req)
    expect(res.status).toBe(503)
  })

  it("returns 502 when the LLM response is not valid JSON", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Some task", projectId })
      .returning()

    mockChatCompletion.mockResolvedValueOnce({
      content: "this is not valid json",
      model: "mock-llm-v1",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    })

    const req = createTestRequest("/api/ai/categorize", {
      method: "POST",
      body: { taskId: task.id },
    })
    const res = await CATEGORIZE(req)
    expect(res.status).toBe(502)
  })
})

// ---------------------------------------------------------------------------
// POST /api/ai/summarize
// ---------------------------------------------------------------------------

describe("POST /api/ai/summarize", () => {
  it("summarizes a project with tasks", async () => {
    await db.insert(tasks).values([
      { title: "Task 1", status: "completed", priority: "high", projectId },
      {
        title: "Task 2",
        status: "in_progress",
        priority: "medium",
        projectId,
      },
      { title: "Task 3", status: "open", priority: "low", projectId },
    ])

    const req = createTestRequest("/api/ai/summarize", {
      method: "POST",
      body: { projectId },
    })
    const res = await SUMMARIZE(req)
    const { status, data } = await parseResponse<SummarizeResponse>(res)

    expect(status).toBe(200)
    expect(data.project).toBeDefined()
    expect(data.project.name).toBe("AI Test Project")
    expect(data.summary).toBeDefined()
    expect(typeof data.summary.summary).toBe("string")
    expect(data.summary.summary.length).toBeGreaterThan(0)
    expect(typeof data.summary.taskCount).toBe("number")
    expect(["on_track", "needs_attention", "completed"]).toContain(
      data.summary.health
    )
  })

  it("handles project with no tasks", async () => {
    const req = createTestRequest("/api/ai/summarize", {
      method: "POST",
      body: { projectId },
    })
    const res = await SUMMARIZE(req)
    const { status, data } = await parseResponse<SummarizeResponse>(res)

    expect(status).toBe(200)
    expect(data.summary).toBeDefined()
  })

  it("returns 400 when projectId is missing", async () => {
    const req = createTestRequest("/api/ai/summarize", {
      method: "POST",
      body: {},
    })
    const res = await SUMMARIZE(req)

    expect(res.status).toBe(400)
  })

  it("returns 404 when project does not exist", async () => {
    const req = createTestRequest("/api/ai/summarize", {
      method: "POST",
      body: { projectId: "00000000-0000-0000-0000-000000000000" },
    })
    const res = await SUMMARIZE(req)

    expect(res.status).toBe(404)
  })

  it("returns 503 when the LLM service is unreachable", async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const req = createTestRequest("/api/ai/summarize", {
      method: "POST",
      body: { projectId },
    })
    const res = await SUMMARIZE(req)
    expect(res.status).toBe(503)
  })
})

// ---------------------------------------------------------------------------
// POST /api/ai/suggest-priority
// ---------------------------------------------------------------------------

describe("POST /api/ai/suggest-priority", () => {
  it("suggests critical priority for security issues", async () => {
    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: {
        title: "Security vulnerability in auth",
        description:
          "SQL injection found in login endpoint, urgent security fix needed",
      },
    })
    const res = await SUGGEST_PRIORITY(req)
    const { status, data } = await parseResponse<SuggestPriorityResponse>(res)

    expect(status).toBe(200)
    expect(data.suggestion).toBeDefined()
    expect(data.suggestion.priority).toBe("critical")
    expect(typeof data.suggestion.reasoning).toBe("string")
  })

  it("suggests medium priority for standard tasks", async () => {
    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: {
        title: "User profile page",
        description: "Add avatar to the profile settings",
      },
    })
    const res = await SUGGEST_PRIORITY(req)
    const { data } = await parseResponse<SuggestPriorityResponse>(res)

    expect(data.suggestion.priority).toBe("medium")
  })

  it("suggests low priority for non-urgent items", async () => {
    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: {
        title: "Minor cosmetic fix",
        description:
          "Nice to have visual tweak, address later when time permits",
      },
    })
    const res = await SUGGEST_PRIORITY(req)
    const { data } = await parseResponse<SuggestPriorityResponse>(res)

    expect(data.suggestion.priority).toBe("low")
  })

  it("returns 400 when title is missing", async () => {
    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: { description: "No title provided" },
    })
    const res = await SUGGEST_PRIORITY(req)

    expect(res.status).toBe(400)
  })

  it("works with title only (no description)", async () => {
    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: { title: "Fix broken deployment pipeline" },
    })
    const res = await SUGGEST_PRIORITY(req)
    const { status, data } = await parseResponse<SuggestPriorityResponse>(res)

    expect(status).toBe(200)
    expect(data.suggestion).toBeDefined()
  })

  it("returns 503 when the LLM service is unreachable", async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const req = createTestRequest("/api/ai/suggest-priority", {
      method: "POST",
      body: { title: "Anything" },
    })
    const res = await SUGGEST_PRIORITY(req)
    expect(res.status).toBe(503)
  })
})
