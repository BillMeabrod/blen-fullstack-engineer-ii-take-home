'use client'

import { useEffect, useRef, useState } from 'react'
import type { Task } from '@/lib/schema'

interface Props {
  task: Task | null
  onClose: () => void
  onSave: (task: Task) => void
  onDelete: (taskId: string) => void
}

interface PrioritySuggestion {
  priority: string
  reasoning: string
}

interface CategorizationResult {
  category: string
  confidence: number
  alreadyPresent?: boolean
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TaskSlideOut({ task, onClose, onSave, onDelete }: Props) {
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [priorityLoading, setPriorityLoading] = useState(false)
  const [prioritySuggestion, setPrioritySuggestion] = useState<PrioritySuggestion | null>(null)
  const [priorityError, setPriorityError] = useState<string | null>(null)

  const [categorizeLoading, setCategorizeLoading] = useState(false)
  const [categorizeResult, setCategorizeResult] = useState<CategorizationResult | null>(null)
  const [categorizeError, setCategorizeError] = useState<string | null>(null)

  const labelInputRef = useRef<HTMLInputElement>(null)
  const mouseDownOnBackdrop = useRef(false)

  useEffect(() => {
    if (!task) return
    setStatus(task.status)
    setPriority(task.priority)
    setAssignee(task.assignee ?? '')
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
    setDescription(task.description ?? '')
    setLabels(task.labels ?? [])
    setPrioritySuggestion(null); setPriorityError(null)
    setCategorizeResult(null); setCategorizeError(null)
    setSaveError(null); setStatusError(null)
    setShowDeleteConfirm(false)
  }, [task])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && task) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [task, onClose])

  useEffect(() => {
    if (addingLabel) labelInputRef.current?.focus()
  }, [addingLabel])

  async function handleSuggestPriority() {
    if (!task) return
    setPriorityLoading(true)
    setPrioritySuggestion(null)
    setPriorityError(null)
    try {
      const res = await fetch('/api/ai/suggest-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, description: task.description ?? undefined }),
      })
      if (res.status === 503) throw new Error('AI service unavailable. Please try again.')
      if (res.status === 502) throw new Error('AI returned an unexpected response. Please try again.')
      if (!res.ok) throw new Error('Something went wrong. Please check your connection.')
      const data = await res.json()
      setPrioritySuggestion(data.suggestion)
    } catch (err) {
      setPriorityError(err instanceof Error ? err.message : 'Something went wrong. Please check your connection.')
    } finally {
      setPriorityLoading(false)
    }
  }

  async function handleAutoCategorize() {
    if (!task) return
    setCategorizeLoading(true)
    setCategorizeResult(null)
    setCategorizeError(null)
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      if (res.status === 503) throw new Error('AI service unavailable. Please try again.')
      if (res.status === 502) throw new Error('AI returned an unexpected response. Please try again.')
      if (!res.ok) throw new Error('Something went wrong. Please check your connection.')
      const data = await res.json()
      const category: string = data.categorization.category
      const alreadyPresent = labels.includes(category)
      setCategorizeResult({ ...data.categorization, alreadyPresent })
    } catch (err) {
      setCategorizeError(err instanceof Error ? err.message : 'Something went wrong. Please check your connection.')
    } finally {
      setCategorizeLoading(false)
    }
  }

  function removeLabel(label: string) {
    setLabels(prev => prev.filter(l => l !== label))
    if (categorizeResult && categorizeResult.category === label) {
      setCategorizeResult(prev => prev ? { ...prev, alreadyPresent: false } : null)
    }
  }

  function addLabel(label: string) {
    const trimmed = label.trim()
    if (!trimmed || labels.includes(trimmed)) return
    setLabels(prev => [...prev, trimmed])
  }

  async function handleSave() {
    if (!task) return
    setSaving(true)
    setSaveError(null)
    setStatusError(null)

    const changed: Record<string, unknown> = {}
    if (status !== task.status) changed.status = status
    if (priority !== task.priority) changed.priority = priority
    if (assignee !== (task.assignee ?? '')) changed.assignee = assignee || null
    const origDue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    if (dueDate !== origDue) changed.dueDate = dueDate || null
    if (description !== (task.description ?? '')) changed.description = description
    if (JSON.stringify(labels) !== JSON.stringify(task.labels ?? [])) changed.labels = labels

    if (Object.keys(changed).length === 0) { setSaving(false); onClose(); return }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed),
      })
      const data = await res.json()
      if (res.status === 400 || res.status === 409) {
        if (changed.status) {
          setStatusError(data.error ?? 'Invalid status transition')
        } else {
          setSaveError(data.error ?? 'Save failed')
        }
        return
      }
      if (!res.ok) { setSaveError('Something went wrong. Please check your connection.'); return }
      onSave(data)
      onClose()
    } catch {
      setSaveError('Something went wrong. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) { setSaveError('Delete failed.'); return }
      onDelete(task.id)
      onClose()
    } catch {
      setSaveError('Something went wrong.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const isOpen = !!task

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 150,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'all' : 'none',
          transition: 'opacity 0.25s',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'fixed', top: 0, right: 0,
          width: '480px', height: '100vh',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          zIndex: 160, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {task && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Task Detail</span>
              <button type="button" aria-label="Close task details" onClick={onClose} style={closeBtn}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '20px 20px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                {task.title}
              </div>
              <div style={{ padding: '6px 20px 16px', fontSize: '11px', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                Created {formatDate(task.createdAt)} · Updated {formatDate(task.updatedAt)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <div style={fieldLabelStyle}>Status</div>
                  <select
                    value={status}
                    onChange={e => { setStatus(e.target.value); setStatusError(null) }}
                    style={fieldSelectStyle}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                  </select>
                  {statusError && <p style={{ color: 'var(--accent)', fontSize: '11px', marginTop: 4 }}>{statusError}</p>}
                </div>

                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={fieldLabelStyle}>Priority</div>
                  <select value={priority} onChange={e => setPriority(e.target.value)} style={fieldSelectStyle}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  {prioritySuggestion && (
                    <div style={aiResultStyle}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                        Suggested Priority
                      </div>
                      <strong style={{ color: 'var(--text-1)', textTransform: 'capitalize' }}>{prioritySuggestion.priority}</strong>
                      <div style={{ marginTop: 4, color: 'var(--text-3)', fontSize: '11px' }}>{prioritySuggestion.reasoning}</div>
                    </div>
                  )}
                  {priorityError && <p style={{ color: 'var(--accent)', fontSize: '11px', marginTop: 4 }}>{priorityError}</p>}
                  <button
                    onClick={handleSuggestPriority}
                    disabled={priorityLoading}
                    style={aiTextBtn}
                  >
                    {priorityLoading ? (
                      <><div style={spinnerStyle} /><span>Analyzing...</span></>
                    ) : (
                      <span>✦ Suggest priority</span>
                    )}
                  </button>
                </div>

                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--border)' }}>
                  <div style={fieldLabelStyle}>Assignee</div>
                  <input
                    type="text"
                    value={assignee}
                    onChange={e => setAssignee(e.target.value)}
                    style={fieldInputStyle}
                  />
                </div>

                <div style={{ padding: '14px 20px' }}>
                  <div style={fieldLabelStyle}>Due Date</div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={fieldInputStyle}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={sectionLabelStyle}>Labels</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {labels.map(label => (
                    <span
                      key={label}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 3,
                        fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: 'rgba(188,140,255,0.15)', color: 'var(--purple)',
                      }}
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        style={{ cursor: 'pointer', opacity: 0.6, fontSize: '11px', background: 'none', border: 'none', color: 'inherit', lineHeight: 1, padding: 0 }}
                      >✕</button>
                    </span>
                  ))}

                  {addingLabel ? (
                    <input
                      ref={labelInputRef}
                      type="text"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addLabel(newLabel); setNewLabel(''); setAddingLabel(false) }
                        if (e.key === 'Escape') { setNewLabel(''); setAddingLabel(false) }
                      }}
                      onBlur={() => { if (newLabel.trim()) addLabel(newLabel); setNewLabel(''); setAddingLabel(false) }}
                      placeholder="label"
                      style={{ fontSize: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '3px 8px', color: 'var(--text-1)', outline: 'none', width: 80 }}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingLabel(true)}
                      style={{
                        padding: '3px 8px', border: '1px dashed var(--border)', borderRadius: 3,
                        fontSize: '10px', color: 'var(--text-3)', cursor: 'pointer', background: 'none',
                      }}
                    >+ Add label</button>
                  )}
                </div>

                {categorizeResult && (
                  <div style={{ ...aiResultStyle, marginTop: 8 }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                      AI Categorization
                    </div>
                    {categorizeResult.alreadyPresent ? (
                      <span style={{ color: 'var(--text-2)' }}>Already in labels: <strong style={{ textTransform: 'capitalize' }}>{categorizeResult.category}</strong></span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span>
                          <strong style={{ color: 'var(--text-1)', textTransform: 'capitalize' }}>{categorizeResult.category}</strong>
                          {' · '}{Math.round(categorizeResult.confidence * 100)}% confidence
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            addLabel(categorizeResult.category)
                            setCategorizeResult(prev => prev ? { ...prev, alreadyPresent: true } : null)
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                        >
                          + Add label
                        </button>
                      </span>
                    )}
                  </div>
                )}
                {categorizeError && <p style={{ color: 'var(--accent)', fontSize: '11px', marginTop: 4 }}>{categorizeError}</p>}

                <button onClick={handleAutoCategorize} disabled={categorizeLoading} style={aiTextBtn}>
                  {categorizeLoading ? (
                    <><div style={spinnerStyle} /><span>Categorizing...</span></>
                  ) : (
                    <span>✦ Auto-categorize</span>
                  )}
                </button>
              </div>

              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={sectionLabelStyle}>Description</div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '10px 12px', color: 'var(--text-2)',
                    fontSize: '13px', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit',
                    outline: 'none', minHeight: 80,
                  }}
                />
              </div>

              {saveError && (
                <div style={{ padding: '12px 20px' }}>
                  <p style={{ color: 'var(--accent)', fontSize: '12px' }}>{saveError}</p>
                </div>
              )}
            </div>

            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0, background: 'var(--surface)',
            }}>
              <button onClick={() => setShowDeleteConfirm(true)} style={btnDangerStyle}>Delete task</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={btnPrimaryStyle}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            {showDeleteConfirm && (
              <div
                style={{
                  position: 'fixed', inset: 0,
                  background: 'rgba(0,0,0,0.75)',
                  zIndex: 300,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '24px',
                }}
                onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget }}
                onClick={() => { if (mouseDownOnBackdrop.current) setShowDeleteConfirm(false) }}
              >
                <div
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '10px', width: '100%', maxWidth: '400px', overflow: 'hidden',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '24px 24px 16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                      Delete task?
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      This cannot be undone.
                    </p>
                  </div>
                  <div style={{
                    padding: '14px 24px', borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                  }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={btnSecondaryStyle}>Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} style={btnDangerConfirmStyle}>
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 5, background: 'transparent', border: 'none',
  color: 'var(--text-3)', fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const fieldLabelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text-3)', marginBottom: 6,
}
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text-3)', marginBottom: 8,
}
const fieldSelectStyle: React.CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text-1)', fontSize: '12px', padding: '4px 8px', cursor: 'pointer',
  width: '100%', appearance: 'none', outline: 'none',
}
const fieldInputStyle: React.CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5,
  color: 'var(--text-1)', fontSize: '12px', padding: '4px 8px', width: '100%', outline: 'none',
}
const aiTextBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--accent)',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  padding: 0, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5,
  letterSpacing: '0.03em',
}
const aiResultStyle: React.CSSProperties = {
  marginTop: 6, padding: '10px 12px', background: 'var(--surface)',
  border: '1px solid var(--border)', borderLeft: '2px solid var(--accent)',
  borderRadius: 5, fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5,
}
const spinnerStyle: React.CSSProperties = {
  width: 10, height: 10, border: '1.5px solid rgba(218,35,41,0.3)',
  borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  flexShrink: 0,
}
const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 16px', background: 'var(--accent)', color: 'white', border: 'none',
  borderRadius: 5, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', cursor: 'pointer',
}
const btnSecondaryStyle: React.CSSProperties = {
  padding: '6px 14px', background: 'transparent', color: 'var(--text-2)',
  border: '1px solid var(--border)', borderRadius: 5, fontSize: '11px',
  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
}
const btnDangerStyle: React.CSSProperties = {
  padding: '6px 14px', background: 'transparent', border: '1px solid rgba(218,35,41,0.4)',
  color: 'var(--accent)', borderRadius: 5, fontSize: '11px', fontWeight: 600, cursor: 'pointer',
}
const btnDangerConfirmStyle: React.CSSProperties = {
  padding: '6px 16px', background: 'var(--accent)', border: 'none',
  color: 'white', borderRadius: 5, fontSize: '11px', fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
}
