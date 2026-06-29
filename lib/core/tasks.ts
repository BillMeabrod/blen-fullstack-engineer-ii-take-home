/**
 * Core — Tasks
 *
 * Business logic for task management. This is the only place that enforces
 * task rules. No HTTP concerns, no Drizzle imports — pure domain logic.
 */

import { VALID_STATUS_TRANSITIONS } from "@/lib/types"
import type { TaskStatus } from "@/lib/schema"

export function validateStatusTransition(
  from: TaskStatus,
  to: TaskStatus
): void {
  if (from === to) return

  const allowed = VALID_STATUS_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`)
  }
}