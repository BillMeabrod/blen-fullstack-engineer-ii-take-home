# Blen Task Tracker — UI Implementation Spec

## Visual Reference
The mockup lives at `docs/blen-mockup.html`. Open it in a browser before writing any code.
All layout, spacing, color, and interaction decisions should match the mockup exactly.
If something is not covered by this spec, reference the mockup first. If the mockup doesn't cover it either, stop and ask.

---

## Agent Behavior Rules

### Before writing any code, read these files in order:
1. `docs/UI_SPEC.md` — this file, the full implementation spec
2. `docs/blen-mockup.html` — the visual reference (open in a browser to see the design)
3. `app/layout.tsx` — the existing layout
4. `lib/schema.ts` — the data models
5. `lib/types.ts` — the domain types

### Implementation order:
1. Global layout and nav (`app/layout.tsx`)
2. `app/page.tsx` — project list page
3. `app/projects/[id]/page.tsx` — project detail page
4. Shared components — dialogs, modals, slide-out panel

### General rules:
- This is a **React** implementation using **Next.js App Router** and **TypeScript**
- Use `next/link` for all client-side navigation between pages — do not use `router.push` or `window.location` for navigation
- Dynamic route params are async in Next.js 16: always use `const { id } = await params` in page components
- Do not add comments unless the logic is genuinely non-obvious — no block comments above functions, no inline narration of what the code is doing
- Do not use `any` types anywhere
- Do not install new dependencies without flagging it and asking first
- Do not modify any files outside of `app/` and `components/` unless explicitly necessary
- Do not touch test files, API routes, or anything in `lib/`
- Follow existing file naming conventions in the project — kebab-case filenames
- Use existing shadcn/ui components where they fit before writing custom ones
- If something in the spec is ambiguous or missing, **stop and ask** before proceeding — do not make assumptions silently

---

## Stack & Constraints
- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Server components for all data fetching
- `'use client'` only where interaction requires it — prefer server components
- Logo: `public/logo.png`
- Desktop-first. Minimum width 1024px. No mobile layout required.

---

## Color Tokens
Add to `app/globals.css`:

```css
:root {
  --bg:         #0D1117;
  --surface:    #161B22;
  --surface-2:  #1C2128;
  --border:     #21262D;
  --accent:     #da2329;
  --accent-dim: #b01c21;
  --text-1:     #F0F6FC;
  --text-2:     #8B949E;
  --text-3:     #6E7681;
  --green:      #3FB950;
  --yellow:     #D29922;
  --blue:       #58A6FF;
  --purple:     #BC8CFF;
}
```

---

## Global Layout

### Navigation
- Sticky top nav, height 56px, `background: var(--bg)`, bottom border `var(--border)`
- Logo (`public/logo.png`) on the left, height 28px
- Nav links on the right: **Projects** | **Team** | **Settings**
- Active link: `color: var(--text-1)`, 2px bottom border in `var(--accent)`
- Inactive links: `color: var(--text-2)`
- **Team** and **Settings** open the Coming Soon modal — they do not navigate

### Hero Section
Every page has a hero section:
- Eyebrow: 10px, uppercase, `color: var(--accent)`, letter-spacing 0.14em
- H1: 40px, 800 weight, `color: var(--text-1)`, letter-spacing -1px
- Subtitle: 14px, `color: var(--text-2)`

### Floating Surface Card
- `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 10px`
- `margin-top: -36px` to rise from the hero
- `margin-left/right: 48px`
- `overflow: hidden`

---

## Page 1 — `/` Project List

### Data Fetching
Server component. Fetch from `GET /api/projects`. Accepts optional `?status=` query param for filtering.

### Hero
- Eyebrow: "Workspace"
- H1: "Projects"
- Subtitle: "Track work across your team. AI-assisted categorization, prioritization, and health summaries."

### Toolbar (inside surface card)
- Left: status filter buttons — **All** | **Active** | **Completed** | **Archived**
  - Active filter styled with `background: var(--accent)`, white text
  - Clicking a filter updates the URL query param and re-fetches
- Right: **+ New Project** button — opens Create Project dialog

### Project Table
Desktop table layout. Columns:

| Column | Notes |
|--------|-------|
| Project | Name only, 13px 600 weight, `color: var(--text-1)`, `white-space: nowrap`, truncate with ellipsis |
| Description | 12px, `color: var(--text-3)`, single line, truncate with ellipsis. Empty if null. |
| Status | Pill badge — green=active, blue=completed, grey=archived |
| Tasks | Task count number from `taskCount` field |
| AI Summary | "✦ How's this going?" button — opens AI Summary modal. Uses `event.stopPropagation()` so row click does not trigger. |
| *(empty)* | "View →" text, visible on row hover only |

- Entire row is clickable, navigates to `/projects/[id]`
- Row hover: `background: var(--surface-2)`
- Table header row: 10px uppercase labels, `color: var(--text-3)`, `background: var(--surface-2)`

---

## Page 2 — `/projects/[id]` Project Detail

### Data Fetching
Server component. Fetch from `GET /api/projects/[id]`. Returns project with tasks array and taskCounts.

### Hero
- Eyebrow: "Project · {status}" (e.g. "Project · Active")
- H1: project name
- Subtitle: "Started {createdAt} · Last updated {updatedAt}" — format dates as "Jun 1, 2026"
- "✦ How's this going?" button in hero (right-aligned) — opens AI Summary modal

### Description Section (top of surface card)
- Label: "DESCRIPTION" in field label style
- Text truncated to 2 lines with CSS line-clamp
- "Show more" text button below to expand. Toggles to "Show less". 
- Hide section entirely if description is null.

### Task Count Bar
Five items: **Total** | **Open** | **In Progress** | **In Review** | **Completed**
- Each shows a large number (22px, 800 weight) and a small uppercase label
- Colors: Open=`var(--text-3)`, In Progress=`var(--yellow)`, In Review=`var(--purple)`, Completed=`var(--green)`, Total=`var(--text-1)`
- Separated by `var(--border)` vertical dividers

### Task Toolbar
- Left: status filter buttons — **All** | **Open** | **In Progress** | **In Review** | **Completed**
- Right: **+ New Task** button — opens Create Task dialog

### Task Table
Columns:

| Column | Notes |
|--------|-------|
| *(dot)* | 8px status dot — hollow circle=open, yellow=in_progress, purple=in_review, green=completed |
| Task | Title, 13px, truncate with ellipsis |
| Assignee | 12px `var(--text-2)`. Show "—" if null |
| Priority | Pill badge — critical=red, high=yellow, medium=blue, low=grey |
| Labels | All labels as purple pill tags. Show first 2 then "+N more" if more than 2. Show "—" if empty. |
| Due | 12px `var(--text-3)`. Show "—" if null |

- Rows grouped by status with a section header row between groups (10px uppercase, `color: var(--text-3)`, `background: var(--bg)`)
- Group order: In Progress → In Review → Open → Completed
- Clicking a row opens the Task Detail slide-out panel
- Completed rows rendered at 55% opacity
- Row hover: `background: var(--surface-2)`

---

## Task Detail Slide-out Panel

Client component. Slides in from the right edge of the viewport.

### Behavior
- Width: 480px
- Smooth slide-in: `transform: translateX(100%)` → `translateX(0)`, transition 0.25s `cubic-bezier(0.4, 0, 0.2, 1)`
- Semi-transparent backdrop behind the panel
- Close on: X button, Cancel button, backdrop click, Escape key

### Panel Structure (top to bottom)

**Header**
- "Task Detail" title (14px, 700 weight)
- X close button

**Task Title**
- Full title, 18px, 700 weight, no truncation

**Timestamps**
- "Created {date} · Updated {date}" — 11px, `color: var(--text-3)`

**Fields Grid** — 2 columns
- **Status** — dropdown (open / in_progress / in_review / completed). `background: var(--surface-2)`, `color: var(--text-1)`. Validates status transitions on save — invalid transitions show an inline error message and do not save.
- **Priority** — dropdown (low / medium / high / critical). `background: var(--surface-2)`, `color: var(--text-1)`. Below the dropdown: `✦ Suggest priority` text link in `var(--accent)`. Clicking shows inline spinner with label changing to "Analyzing...". On result: show suggested priority and reasoning in an accent-left-bordered box. The suggestion does **not** auto-apply — human must manually update the dropdown.
- **Assignee** — text input, `background: var(--surface-2)`
- **Due Date** — date input, `background: var(--surface-2)`

**Labels Section**
- All labels rendered as removable purple pill tags with an ✕ remove button
- "+ Add label" button for manual entry
- Below labels: `✦ Auto-categorize` text link in `var(--accent)`. Clicking shows inline spinner with label changing to "Categorizing...". On result: show category and confidence in an accent-left-bordered box.
- **Duplicate prevention**: before adding the AI category to labels, check the existing labels array. If already present, show "Already categorized as {category}" — do not add.
- **AI-assigned labels**: visually distinguish AI-assigned category labels (e.g. lock icon or muted ✕). These cannot be removed by the user.

**Description**
- Full editable textarea, `background: var(--surface-2)`, no truncation, resizable vertically

**Footer**
- Left: "Delete task" — destructive button, red border/text
- Right: "Cancel" (secondary) + "Save changes" (primary, `background: var(--accent)`)

### Save Behavior
- PATCH `/api/tasks/[id]` with only changed fields
- Show loading state on Save button during request
- On success: close panel, refresh task list
- On error: show inline error message — do not close panel

### Delete Behavior
- Show confirmation prompt before deleting ("Are you sure? This cannot be undone.")
- DELETE `/api/tasks/[id]`
- On success: close panel, remove task from list

---

## Dialogs

### Create Project Dialog
Fields:
- **Name** (required) — text input
- **Description** (optional) — textarea
- **Status** (optional) — dropdown, default: active

API: `POST /api/projects`

Errors:
- Missing name: "Name is required"
- 409 conflict: "A project with this name already exists"

On success: navigate to `/projects/[id]` of the newly created project.

### Create Task Dialog
Fields:
- **Title** (required) — text input
- **Description** (optional) — textarea
- **Priority** — dropdown (default: medium). Below the dropdown show the AI suggestion result once available.
- **Assignee** (optional) — text input
- **Due Date** (optional) — date input
- **Labels** (optional) — tag input

AI behavior: on title input `blur`, automatically call `POST /api/ai/suggest-priority` with the title value. Show inline spinner below the Priority field while waiting. On result, display suggested priority and reasoning and pre-fill the Priority dropdown with the suggestion. User can override.

API: `POST /api/tasks` with the project ID from the current page.

On success: close dialog, add new task to list without full page reload.

---

## Modals

### AI Summary Modal
Trigger: "✦ How's this going?" on project list rows or project detail hero.

Behavior:
- On open: immediately call `POST /api/ai/summarize` with the `projectId`
- **Loading state**: centered spinner (28px), label "Analyzing project health..."
- **Result state**:
  - Eyebrow: "Project Summary" in `var(--accent)`
  - Project name (18px, 700 weight)
  - Health badge: on_track=green, needs_attention=yellow, completed=blue
  - Summary text in a box with `border-left: 2px solid var(--accent)`, `background: var(--surface-2)`
- Close on: X button, Close button, backdrop click

### Coming Soon Modal
Trigger: Team nav link, Settings nav link.

Content:
- 🚧 icon
- "Coming Soon" heading
- "This section is not yet available in this version of the application."

Close on: X button, Close button, backdrop click.

---

## AI Interaction Rules
- All AI buttons show an inline spinner during the request. The button label changes to a present-tense action word during loading ("Analyzing...", "Categorizing..."). Reverts to original label when complete.
- AI results are advisory only and never auto-apply without user awareness — **exception**: Auto-categorize does add the label automatically if not already present in the labels array.
- Never add duplicate labels — always check the existing labels array before adding.
- AI-assigned category labels are visually distinguished and cannot be removed by the user.
- On 503: show "AI service unavailable. Please try again." inline in place of the result.
- On 502: show "AI returned an unexpected response. Please try again." inline.
- On network error: show "Something went wrong. Please check your connection."

---

## API Error Handling (General)
| Status | Message |
|--------|---------|
| 400 | Show field-level validation message from the error response body |
| 404 | Show "Not found" and redirect to home |
| 409 | Show conflict message inline (duplicate name, invalid status transition) |
| 503 | "AI service unavailable. Please try again." |
| 502 | "AI returned an unexpected response. Please try again." |
| Network error | "Something went wrong. Please check your connection." |