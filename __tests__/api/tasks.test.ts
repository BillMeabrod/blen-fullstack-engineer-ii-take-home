import { drizzle } from "drizzle-orm/postgres-js"
import { eq } from "drizzle-orm"
import postgres from "postgres"
import * as schema from "../../lib/schema"
import { projects, tasks, type Task } from "../../lib/schema"
import type { PaginatedResponse } from "../../lib/types"
import { createTestRequest, parseResponse } from "../helpers/request"
import { GET, POST } from "@/app/api/tasks/route"
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/tasks/[id]/route"

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

type TaskWithProject = Task & { project: { id: string; name: string } }

let projectId: string

beforeEach(async () => {
  await db.delete(tasks)
  await db.delete(projects)

  const [project] = await db
    .insert(projects)
    .values({ name: "Test Project", description: "For task tests" })
    .returning()
  projectId = project.id
})

afterAll(async () => {
  await db.delete(tasks)
  await db.delete(projects)
  await client.end()
})

// ---------------------------------------------------------------------------
// POST /api/tasks
// ---------------------------------------------------------------------------

describe("POST /api/tasks", () => {
  it("creates a task with valid data", async () => {
    const req = createTestRequest("/api/tasks", {
      method: "POST",
      body: {
        title: "New Task",
        description: "Task description",
        projectId,
        priority: "high",
        assignee: "alice",
      },
    })

    const res = await POST(req)
    const { status, data } = await parseResponse<Task>(res)

    expect(status).toBe(201)
    expect(data).toMatchObject({
      title: "New Task",
      description: "Task description",
      status: "open",
      priority: "high",
      assignee: "alice",
      projectId,
    })
    expect(data).toHaveProperty("id")
  })

  it("returns 400 when title is missing", async () => {
    const req = createTestRequest("/api/tasks", {
      method: "POST",
      body: { projectId },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when projectId is missing", async () => {
    const req = createTestRequest("/api/tasks", {
      method: "POST",
      body: { title: "Orphan Task" },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when projectId references non-existent project", async () => {
    const req = createTestRequest("/api/tasks", {
      method: "POST",
      body: {
        title: "Bad Reference",
        projectId: "00000000-0000-0000-0000-000000000000",
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("defaults status to 'open' and priority to 'medium'", async () => {
    const req = createTestRequest("/api/tasks", {
      method: "POST",
      body: { title: "Defaults Task", projectId },
    })

    const res = await POST(req)
    const { data } = await parseResponse<Task>(res)

    expect(data.status).toBe("open")
    expect(data.priority).toBe("medium")
  })
})

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------

describe("GET /api/tasks", () => {
  beforeEach(async () => {
    await db.insert(tasks).values([
      {
        title: "Task A",
        status: "open",
        priority: "high",
        assignee: "alice",
        projectId,
      },
      {
        title: "Task B",
        status: "in_progress",
        priority: "medium",
        assignee: "bob",
        projectId,
      },
      {
        title: "Task C",
        status: "open",
        priority: "low",
        assignee: "alice",
        projectId,
      },
      {
        title: "Task D",
        status: "completed",
        priority: "critical",
        assignee: "charlie",
        projectId,
      },
      {
        title: "Task E",
        status: "open",
        priority: "medium",
        projectId,
      },
    ])
  })

  it("returns paginated tasks", async () => {
    const req = createTestRequest("/api/tasks", {
      searchParams: { page: "1", pageSize: "2" },
    })
    const res = await GET(req)
    const { status, data } = await parseResponse<PaginatedResponse<Task>>(res)

    expect(status).toBe(200)
    expect(data.data).toHaveLength(2)
    expect(data.pagination.total).toBe(5)
    expect(data.pagination.totalPages).toBe(3)
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.pageSize).toBe(2)
  })

  it("filters by status", async () => {
    const req = createTestRequest("/api/tasks", {
      searchParams: { status: "open" },
    })
    const res = await GET(req)
    const { data } = await parseResponse<PaginatedResponse<Task>>(res)

    expect(data.data).toHaveLength(3)
    data.data.forEach((task) => expect(task.status).toBe("open"))
  })

  it("filters by priority", async () => {
    const req = createTestRequest("/api/tasks", {
      searchParams: { priority: "high" },
    })
    const res = await GET(req)
    const { data } = await parseResponse<PaginatedResponse<Task>>(res)

    expect(data.data).toHaveLength(1)
    expect(data.data[0].title).toBe("Task A")
  })

  it("filters by assignee", async () => {
    const req = createTestRequest("/api/tasks", {
      searchParams: { assignee: "alice" },
    })
    const res = await GET(req)
    const { data } = await parseResponse<PaginatedResponse<Task>>(res)

    expect(data.data).toHaveLength(2)
    data.data.forEach((task) => expect(task.assignee).toBe("alice"))
  })

  it("filters by projectId", async () => {
    const [otherProject] = await db
      .insert(projects)
      .values({ name: "Other Project" })
      .returning()

    await db.insert(tasks).values({
      title: "Other Task",
      projectId: otherProject.id,
    })

    const req = createTestRequest("/api/tasks", {
      searchParams: { projectId },
    })
    const res = await GET(req)
    const { data } = await parseResponse<PaginatedResponse<Task>>(res)

    expect(data.data).toHaveLength(5)
    data.data.forEach((task) => expect(task.projectId).toBe(projectId))
  })
})

// ---------------------------------------------------------------------------
// GET /api/tasks/:id
// ---------------------------------------------------------------------------

describe("GET /api/tasks/:id", () => {
  it("returns a task with project info", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Detail Task", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`)
    const res = await GET_BY_ID(req, {
      params: Promise.resolve({ id: task.id }),
    })
    const { status, data } = await parseResponse<TaskWithProject>(res)

    expect(status).toBe(200)
    expect(data.title).toBe("Detail Task")
    expect(data.project).toBeDefined()
    expect(data.project.name).toBe("Test Project")
  })

  it("returns 404 for non-existent task", async () => {
    const req = createTestRequest(
      "/api/tasks/00000000-0000-0000-0000-000000000000"
    )
    const res = await GET_BY_ID(req, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id — Status Transitions
// ---------------------------------------------------------------------------

describe("PATCH /api/tasks/:id", () => {
  it("allows valid transition: open -> in_progress", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Flow Task", status: "open", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "in_progress" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })
    const { status, data } = await parseResponse<Task>(res)

    expect(status).toBe(200)
    expect(data.status).toBe("in_progress")
  })

  it("allows valid transition: in_progress -> in_review", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Review Task", status: "in_progress", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "in_review" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(200)
    const { data } = await parseResponse<Task>(res)
    expect(data.status).toBe("in_review")
  })

  it("allows valid transition: in_review -> completed", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Complete Task", status: "in_review", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "completed" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(200)
  })

  it("allows valid transition: completed -> in_progress (reopen)", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Reopen Task", status: "completed", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "in_progress" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(200)
    const { data } = await parseResponse<Task>(res)
    expect(data.status).toBe("in_progress")
  })

  it("allows same-status PATCH as a no-op (idempotent)", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Idempotent Task", status: "open", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "open" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })
    const { status, data } = await parseResponse<Task>(res)

    expect(status).toBe(200)
    expect(data.status).toBe("open")
  })

  it("rejects invalid transition: open -> completed", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Skip Task", status: "open", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "completed" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(400)
  })

  it("rejects invalid transition: open -> in_review", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Bad Skip", status: "open", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { status: "in_review" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(400)
  })

  it("updates non-status fields without status validation", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Update Me", priority: "low", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "PATCH",
      body: { title: "Updated Title", priority: "critical", assignee: "dave" },
    })
    const res = await PATCH(req, {
      params: Promise.resolve({ id: task.id }),
    })
    const { status, data } = await parseResponse<Task>(res)

    expect(status).toBe(200)
    expect(data.title).toBe("Updated Title")
    expect(data.priority).toBe("critical")
    expect(data.assignee).toBe("dave")
  })

  it("returns 404 for non-existent task", async () => {
    const req = createTestRequest(
      "/api/tasks/00000000-0000-0000-0000-000000000000",
      { method: "PATCH", body: { title: "Ghost" } }
    )
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    })

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/tasks/:id", () => {
  it("deletes a task", async () => {
    const [task] = await db
      .insert(tasks)
      .values({ title: "Delete Me", projectId })
      .returning()

    const req = createTestRequest(`/api/tasks/${task.id}`, {
      method: "DELETE",
    })
    const res = await DELETE(req, {
      params: Promise.resolve({ id: task.id }),
    })

    expect(res.status).toBe(200)

    const found = await db.select().from(tasks).where(eq(tasks.id, task.id))
    expect(found).toHaveLength(0)
  })

  it("returns 404 for non-existent task", async () => {
    const req = createTestRequest(
      "/api/tasks/00000000-0000-0000-0000-000000000000",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    })

    expect(res.status).toBe(404)
  })
})
