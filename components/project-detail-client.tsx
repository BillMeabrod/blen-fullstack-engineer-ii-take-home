'use client'

import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/lib/schema'
import AiSummaryModal from './ai-summary-modal'
import CreateTaskDialog from './create-task-dialog'
import TaskSlideOut from './task-slide-out'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  project: Project
  initialTasks: Task[]
}

type TaskFilter = 'all' | 'open' | 'in_progress' | 'in_review' | 'completed'
const STATUS_ORDER: Task['status'][] = ['in_progress', 'in_review', 'open', 'completed']
const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress', in_review: 'In Review', open: 'Open', completed: 'Completed',
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function DotStatus({ status }: { status: Task['status'] }) {
  const styles: Record<string, React.CSSProperties> = {
    open:        { background: 'transparent', border: '1.5px solid var(--text-3)' },
    in_progress: { background: 'var(--yellow)', border: 'none' },
    in_review:   { background: 'var(--purple)', border: 'none' },
    completed:   { background: 'var(--green)', border: 'none' },
  }
  return (
    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, ...styles[status] }} />
  )
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const styles: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(218,35,41,0.2)',   color: 'var(--accent)' },
    high:     { bg: 'rgba(210,153,34,0.2)',  color: 'var(--yellow)' },
    medium:   { bg: 'rgba(88,166,255,0.15)', color: 'var(--blue)' },
    low:      { bg: 'rgba(110,118,129,0.15)',color: 'var(--text-3)' },
  }
  const s = styles[priority]
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: s.bg, color: s.color,
    }}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

export default function ProjectDetailClient({ project, initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [descTruncated, setDescTruncated] = useState(false)
  const [summaryBtnHovered, setSummaryBtnHovered] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = descRef.current
    if (el) setDescTruncated(el.scrollHeight > el.clientHeight)
  }, [project.description])

  const taskCounts = {
    total: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  const filtered = taskFilter === 'all' ? tasks : tasks.filter(t => t.status === taskFilter)

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const group = filtered.filter(t => t.status === status)
    if (group.length > 0) acc.push({ status, tasks: group })
    return acc
  }, [] as { status: Task['status']; tasks: Task[] }[])

  function handleTaskSaved(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  function handleTaskDeleted(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function handleTaskCreated(task: Task) {
    setTasks(prev => [...prev, task])
  }

  const filterBtns: { label: string; value: TaskFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'In Review', value: 'in_review' },
    { label: 'Completed', value: 'completed' },
  ]

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '56px 48px 80px', flexWrap: 'wrap', gap: 24,
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
            Project · {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-1)', marginBottom: 8 }}>
            {project.name}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Started {formatDate(project.createdAt)} · Last updated {formatDate(project.updatedAt)}
          </p>
        </div>
        <button
          onClick={() => setShowSummary(true)}
          onMouseEnter={() => setSummaryBtnHovered(true)}
          onMouseLeave={() => setSummaryBtnHovered(false)}
          style={{
            padding: '10px 20px',
            background: summaryBtnHovered ? 'rgba(218,35,41,0.1)' : 'transparent',
            border: '1px solid var(--accent)',
            color: 'var(--accent)', borderRadius: 6, fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            transition: 'background 0.12s',
          }}
        >
          ✦ How&apos;s this going?
        </button>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
        margin: '-36px 48px 48px', overflow: 'hidden',
      }}>
        {project.description && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
              Description
            </div>
            <div
              ref={descRef}
              style={{
                fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6,
                overflow: descExpanded ? 'visible' : 'hidden',
                display: descExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: descExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical' as const,
              }}
            >
              {project.description}
            </div>
            {(descTruncated || descExpanded) && (
              <button
                onClick={() => setDescExpanded(e => !e)}
                style={{
                  fontSize: '11px', color: 'var(--accent)', cursor: 'pointer',
                  marginTop: 4, display: 'inline-block', background: 'none', border: 'none',
                  padding: 0, fontWeight: 600,
                }}
              >
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: taskCounts.total, color: 'var(--text-1)' },
            { label: 'Open', value: taskCounts.open, color: 'var(--text-3)' },
            { label: 'In Progress', value: taskCounts.in_progress, color: 'var(--yellow)' },
            { label: 'In Review', value: taskCounts.in_review, color: 'var(--purple)' },
            { label: 'Completed', value: taskCounts.completed, color: 'var(--green)' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              paddingRight: 20, marginRight: 20,
              borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {filterBtns.map(btn => (
              <button
                key={btn.value}
                onClick={() => setTaskFilter(btn.value)}
                style={{
                  padding: '5px 12px', borderRadius: 5,
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: '1px solid var(--border)',
                  background: taskFilter === btn.value ? 'var(--accent)' : 'transparent',
                  color: taskFilter === btn.value ? 'white' : 'var(--text-2)',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateTask(true)}
            style={{
              padding: '6px 16px', background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 5, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + New Task
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '130px 1fr 100px 80px 1fr 80px',
          alignItems: 'center', padding: '8px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)', gap: 12,
        }}>
          {['Status', 'Task', 'Assignee', 'Priority', 'Labels', 'Due'].map((col, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {col}
            </div>
          ))}
        </div>

        {grouped.map(group => (
          <div key={group.status}>
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {STATUS_LABELS[group.status]}
            </div>
            {group.tasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No tasks found.
          </div>
        )}
      </div>

      <TaskSlideOut
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleTaskSaved}
        onDelete={handleTaskDeleted}
      />

      <CreateTaskDialog
        projectId={project.id}
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onSuccess={handleTaskCreated}
      />

      {showSummary && (
        <AiSummaryModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  )
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const isCompleted = task.status === 'completed'
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  const visibleLabels = (task.labels ?? []).slice(0, 2)
  const extraCount = (task.labels ?? []).length - 2

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '130px 1fr 100px 80px 1fr 80px',
        alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border)',
        gap: 12, cursor: 'pointer', opacity: isCompleted ? 0.55 : 1,
        background: hovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <DotStatus status={task.status} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {task.title}
      </div>
      <div style={{ fontSize: '12px', color: task.assignee ? 'var(--text-2)' : 'var(--text-3)' }}>
        {task.assignee ?? '—'}
      </div>
      <div><PriorityBadge priority={task.priority} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
        {visibleLabels.length > 0 ? (
          <>
            {visibleLabels.map(label => (
              <span key={label} style={{
                display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                background: 'rgba(188,140,255,0.15)', color: 'var(--purple)', whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            ))}
            {extraCount > 0 && (
              <span style={{ fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>+{extraCount}</span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{dueDateStr}</div>
    </div>
  )
}
