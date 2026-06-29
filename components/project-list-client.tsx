'use client'

import Link from 'next/link'
import { useState } from 'react'
import AiSummaryModal from './ai-summary-modal'
import CreateProjectDialog from './create-project-dialog'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
  taskCount: number
}

interface Props {
  projects: Project[]
  currentStatus: string
}

const statusBadge = (status: Project['status']) => {
  const styles = {
    active:    { bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  label: 'Active' },
    completed: { bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   label: 'Completed' },
    archived:  { bg: 'rgba(110,118,129,0.15)', color: 'var(--text-3)', label: 'Archived' },
  }
  const s = styles[status]
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 20,
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
]

function filterHref(value: string) {
  return value === 'all' ? '/' : `/?status=${value}`
}

function ProjectRow({ project }: { project: Project }) {
  const [hovered, setHovered] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <>
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '180px 1fr 100px 80px 160px 80px',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          gap: 16,
          background: hovered ? 'var(--surface-2)' : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Link href={`/projects/${project.id}`} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
            View project {project.name}
          </span>
        </Link>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {project.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {project.description ?? ''}
        </div>
        <div>{statusBadge(project.status)}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>{project.taskCount}</div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
              cursor: 'pointer',
              background: btnHovered ? 'rgba(218,35,41,0.1)' : 'none',
              border: '1px solid var(--accent)', borderRadius: 4, padding: '4px 10px',
              transition: 'background 0.12s', whiteSpace: 'nowrap',
            }}
          >
            ✦ How&apos;s this going?
          </button>
        </div>
        <div style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          textAlign: 'right', opacity: hovered ? 1 : 0, transition: 'opacity 0.12s',
        }}>
          View →
        </div>
      </div>

      {summaryOpen && (
        <AiSummaryModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </>
  )
}

export default function ProjectListClient({ projects, currentStatus }: Props) {
  const [showCreateProject, setShowCreateProject] = useState(false)

  return (
    <>
      <div style={{ padding: '56px 48px 80px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
          Workspace
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text-1)', marginBottom: 10 }}>
          Projects
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
          Track work across your team. AI-assisted categorization, prioritization, and health summaries.
        </p>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
        margin: '-36px 48px 48px', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(f => (
              <Link
                key={f.value}
                href={filterHref(f.value)}
                style={{
                  display: 'inline-block',
                  padding: '5px 12px', borderRadius: 5,
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: '1px solid var(--border)',
                  background: currentStatus === f.value ? 'var(--accent)' : 'transparent',
                  color: currentStatus === f.value ? 'white' : 'var(--text-2)',
                  textDecoration: 'none',
                }}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            style={{
              padding: '6px 16px', background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 5, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + New Project
          </button>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '180px 1fr 100px 80px 160px 80px',
          padding: '8px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)', gap: 16,
        }}>
          {['Project', 'Description', 'Status', 'Tasks', 'AI Summary', ''].map((col, i) => (
            <div key={i} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {col}
            </div>
          ))}
        </div>

        {projects.map(project => (
          <ProjectRow key={project.id} project={project} />
        ))}

        {projects.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            No projects found.
          </div>
        )}
      </div>

      <CreateProjectDialog isOpen={showCreateProject} onClose={() => setShowCreateProject(false)} />
    </>
  )
}
