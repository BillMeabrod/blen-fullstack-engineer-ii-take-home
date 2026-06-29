'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CreateProjectDialog({ isOpen, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setStatus('active')
      setError(null)
      setSaving(false)
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || undefined }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setError('A project with this name already exists')
        return
      }
      if (res.status === 400) {
        setError(data.error ?? 'Name is required')
        return
      }
      if (!res.ok) {
        setError('Something went wrong. Please check your connection.')
        return
      }
      onClose()
      router.push(`/projects/${data.id}`)
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
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', width: '100%', maxWidth: '480px', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>New Project</span>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, borderRadius: 4, background: 'transparent',
              border: 'none', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Name <span style={{ color: 'var(--accent)' }}>*</span></label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Project name"
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
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
            <button type="submit" disabled={saving} style={btnPrimaryStyle}>
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px', fontWeight: 700,
  letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'var(--text-3)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  color: 'var(--text-1)',
  fontSize: '13px',
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  color: 'var(--text-1)',
  fontSize: '13px',
  padding: '8px 10px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const btnSecondaryStyle: React.CSSProperties = {
  padding: '6px 16px',
  background: 'transparent',
  color: 'var(--text-2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
}
