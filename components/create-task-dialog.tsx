'use client'

import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/lib/schema'

interface Props {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (task: Task) => void
}

interface PrioritySuggestion {
  priority: string
  reasoning: string
}

export default function CreateTaskDialog({ projectId, isOpen, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [labels, setLabels] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [priorityLoading, setPriorityLoading] = useState(false)
  const [prioritySuggestion, setPrioritySuggestion] = useState<PrioritySuggestion | null>(null)
  const [priorityError, setPriorityError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(''); setDescription(''); setPriority('medium')
      setAssignee(''); setDueDate(''); setLabels('')
      setError(null); setSaving(false)
      setPrioritySuggestion(null); setPriorityError(null)
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  async function handleTitleBlur() {
    if (!title.trim()) return
    setPriorityLoading(true)
    setPrioritySuggestion(null)
    setPriorityError(null)
    try {
      const res = await fetch('/api/ai/suggest-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.status === 503) throw new Error('AI service unavailable. Please try again.')
      if (res.status === 502) throw new Error('AI returned an unexpected response. Please try again.')
      if (!res.ok) throw new Error('Something went wrong.')
      const data = await res.json()
      setPrioritySuggestion(data.suggestion)
      setPriority(data.suggestion.priority)
    } catch (err) {
      setPriorityError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPriorityLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError(null)
    try {
      const parsedLabels = labels.split(',').map(l => l.trim()).filter(Boolean)
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), projectId, description: description || undefined,
          priority, assignee: assignee || undefined,
          dueDate: dueDate || undefined,
          labels: parsedLabels.length > 0 ? parsedLabels : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      onSuccess(data)
      onClose()
    } catch {
      setError('Something went wrong. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', width: '100%', maxWidth: '520px',
          overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>New Task</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
            <div>
              <label style={labelStyle}>Title <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Task title"
                style={inputStyle}
              />
              {error && <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: 4 }}>{error}</p>}
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={selectStyle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {priorityLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <div style={spinnerStyle} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Analyzing...</span>
                </div>
              )}
              {prioritySuggestion && !priorityLoading && (
                <div style={aiResultStyle}>
                  <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                    Suggested Priority
                  </div>
                  <strong style={{ color: 'var(--text-1)', textTransform: 'capitalize' }}>{prioritySuggestion.priority}</strong>
                  <div style={{ marginTop: 4, color: 'var(--text-3)', fontSize: '11px' }}>{prioritySuggestion.reasoning}</div>
                </div>
              )}
              {priorityError && <p style={{ color: 'var(--accent)', fontSize: '11px', marginTop: 4 }}>{priorityError}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Assignee</label>
                <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="username" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Labels <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label>
              <input type="text" value={labels} onChange={e => setLabels(e.target.value)} placeholder="bug, feature, auth" style={inputStyle} />
            </div>
          </div>

          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
          }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={btnPrimaryStyle}>
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: '5px', color: 'var(--text-1)', fontSize: '13px', padding: '8px 10px', outline: 'none',
}
const selectStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: '5px', color: 'var(--text-1)', fontSize: '13px', padding: '8px 10px',
  outline: 'none', cursor: 'pointer', appearance: 'none',
}
const closeBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 4, background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 16, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}
const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 16px', background: 'var(--accent)', color: 'white', border: 'none',
  borderRadius: '5px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', cursor: 'pointer',
}
const btnSecondaryStyle: React.CSSProperties = {
  padding: '6px 16px', background: 'transparent', color: 'var(--text-2)',
  border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px',
  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
}
const aiResultStyle: React.CSSProperties = {
  marginTop: 8, padding: '10px 12px', background: 'var(--surface)',
  border: '1px solid var(--border)', borderLeft: '2px solid var(--accent)',
  borderRadius: '5px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5,
}
const spinnerStyle: React.CSSProperties = {
  width: 10, height: 10, border: '1.5px solid rgba(218,35,41,0.3)',
  borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
}
