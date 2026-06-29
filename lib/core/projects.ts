/**
 * Core — Projects
 *
 * Business logic for project management. Pure domain rules,
 * no HTTP concerns, no Drizzle imports.
 */

import type { Task } from "@/lib/schema"


export function validateProjectDeletion(tasks: Task[]): void {
  const blocked = tasks.filter(
    (t) => t.status === "in_progress" || t.status === "in_review"
  )

  if (blocked.length > 0) {
    throw new Error(
      `Cannot delete project with ${blocked.length} active task(s) in progress or in review`
    )
  }
}