# BLEN — Senior Software Developer II (Full Stack) Take-Home

## Candidate Info

> **Please fill this in before submitting.** This helps our reviewers identify your submission.

| Field | Your answer |
|-------|-------------|
| **Name** | <!-- Your full name --> |
| **Email** | <!-- Your email address --> |
| **GitHub** | <!-- Your GitHub username --> |
| **Date submitted** | <!-- e.g. 2026-03-24 --> |

---

## Overview

Build a **Task Tracker with AI Features** — a full-stack application for managing projects and tasks, enhanced with LLM-powered capabilities. The data model, test suite, mock LLM service, and infrastructure are all provided. Your job is to implement the API endpoints, AI integration, business logic, and a functional UI.

**Time expectation:** Please submit within 24 hours. Focus on clean, working code over polish.

## What's Provided

- **Database schema** (Drizzle ORM) with migrations and seed data
- **Docker Compose** with PostgreSQL + a mock LLM service — no external APIs or keys needed
- **Mock LLM service** — an OpenAI-compatible chat completions API that returns deterministic responses (see `mock-llm/server.ts` for behavior)
- **Pre-written test suite** (54 tests) — your implementation must pass all of them
- **API route scaffolds** with detailed JSDoc describing expected behavior and Drizzle hints
- **LLM client scaffold** (`lib/llm.ts`) — implement the wrapper around the mock LLM
- **TypeScript types** including valid status transitions
- **Page scaffolds** for `app/page.tsx` (project list) and `app/projects/[id]/page.tsx` (project detail) with TODO comments
- **Tailwind CSS + shadcn/ui** configured for styling

## Architecture

```
                            +---------------+
                            |   Mock LLM    |
                            |   Service     |
                            |   :11434      |
                            +-------^-------+
                                    |
                              AI Endpoints
                                    |
+---------------+           +-------+-------+
|  PostgreSQL   |<----------|   Next.js     |
|  (Drizzle)    |           |   App         |
|   :5433       |           |   :3002       |
+---------------+           +---------------+
```

## What You Build

### 1. Core API Endpoints (tested)

Implement the route handlers in `app/api/`:

**Projects**
- `GET /api/projects` — List projects with optional status filter, include task counts
- `POST /api/projects` — Create project (unique name required)
- `GET /api/projects/:id` — Get project with task counts by status
- `PATCH /api/projects/:id` — Update project fields
- `DELETE /api/projects/:id` — Delete project (blocked if tasks are in_progress or in_review)

**Tasks**
- `GET /api/tasks` — List tasks with filters (status, priority, assignee, projectId) and pagination
- `POST /api/tasks` — Create task (must reference valid project)
- `GET /api/tasks/:id` — Get task with parent project info
- `PATCH /api/tasks/:id` — Update task (status changes must follow valid transitions)
- `DELETE /api/tasks/:id` — Delete task

**Business Logic:**
- Task status transitions are enforced. See `lib/types.ts` for the transition map.
- Cannot delete a project with tasks in `in_progress` or `in_review` status
- Project names must be unique

**Key files:**
- `lib/schema.ts` — Drizzle schema (tables, enums, relations, inferred types)
- `lib/db.ts` — Database client (drizzle + postgres.js)
- `lib/types.ts` — Status transition map and API types

### 2. AI Integration (tested)

Implement the LLM client and AI endpoints:

**LLM Client** (`lib/llm.ts`)
- Implement `chatCompletion()` to call the mock LLM's OpenAI-compatible API
- Handle errors: service unreachable, invalid responses, timeouts
- The mock LLM runs at `$LLM_BASE_URL/v1/chat/completions`

**AI Endpoints**
- `POST /api/ai/categorize` — Auto-categorize a task (bug, feature, improvement, documentation) and update its labels
- `POST /api/ai/summarize` — Generate a project status summary from its tasks
- `POST /api/ai/suggest-priority` — Suggest priority level for a task description

The mock LLM returns deterministic responses based on keywords in the system prompt and user content. Read `mock-llm/server.ts` to understand the response patterns — your system prompts must include specific keywords to trigger the correct response type.

### 3. Dashboard UI (manually reviewed)

Build a functional UI **using Next.js App Router patterns**:

**App Router Requirements:**
- **File-system routing:** Use `app/page.tsx` for the projects list and `app/projects/[id]/page.tsx` for project detail. Scaffolds for both pages are provided.
- **Server Components:** The default — use them for data fetching and layout. Only add `'use client'` to components that need interactivity (forms, dialogs, click handlers).
- **`Link` navigation:** Use `next/link` for client-side navigation between pages (e.g., project cards link to `/projects/[id]`).
- **Async params:** In Next.js 16, dynamic route params are async: `const { id } = await params`.

**UI features to include:**
- Everything from the core task tracker (projects, tasks, CRUD, filters)
- A way to trigger AI categorization on tasks
- Display AI-suggested priorities when creating tasks
- Show project summaries powered by the LLM

### 4. Solution Design (written)

Complete the questions in `SOLUTION_DESIGN.md`. These focus on production AI architecture, security, and system design at scale.

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (package manager and runtime)
- [Docker](https://www.docker.com/) (for PostgreSQL and the mock LLM service)

### Setup

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Start PostgreSQL and Mock LLM
docker compose up -d

# Wait for services to be healthy, then run migrations and seed
bun run db:migrate
bun run db:seed

# Start the dev server
bun run dev
```

The app is available at http://localhost:3002

### Verify the Mock LLM

```bash
# Health check
curl http://localhost:11434/health

# Test a categorization request
curl -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "Categorize the following task."},
      {"role": "user", "content": "Fix the login bug on mobile"}
    ]
  }'
```

### Running Tests

```bash
# Run the full test suite (requires db + mock-llm running)
bun run test

# Run linting and type checks
bun run lint
bun run typecheck

# Run everything (typecheck + lint + tests)
bun run check
```

### Useful Commands

```bash
# Reset database (drop and re-migrate)
bun run db:reset

# Then re-seed
bun run db:seed

# Generate a new migration after schema changes
bun run db:generate
```

## Submission

1. Click **"Use this template"** on GitHub to create a **private** copy of this repo
2. **Fill in the Candidate Info table at the top of this README**
3. Implement all API routes and the LLM client (replace the `TODO` stubs)
4. Build the dashboard UI with AI features
5. Answer the questions in `SOLUTION_DESIGN.md`
6. Ensure all 54 tests pass, typecheck is clean, and lint passes
7. Add the following GitHub users as **collaborators** on your repo ([how to add collaborators](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository)):
   - `naodya` (Naod — Engineering)
   - `juliusoh` (Julius — Engineering)
8. Send the repo link to your BLEN recruiting contact

## What We Evaluate

| Area | Weight | What We Look For |
|------|--------|-----------------|
| **Tests passing** | 30% | All 54 tests green |
| **Code quality** | 25% | Clean TypeScript, separation of concerns, lint/typecheck clean |
| **AI integration quality** | 20% | Error handling, prompt design, LLM client robustness |
| **Solution design** | 15% | Production thinking, security awareness, trade-offs |
| **UI implementation** | 10% | Functional, includes AI features, well-structured |

## Questions?

If anything is unclear, reach out. We'd rather you ask than guess.

Good luck!
