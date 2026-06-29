'use client'

import { useEffect, useState } from 'react'

type Health = 'on_track' | 'needs_attention' | 'completed'

interface SummaryResult {
  project: { id: string; name: string }
  summary: { summary: string; taskCount: number; health: Health }
}

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

const healthColors: Record<Health, { bg: string; color: string; label: string }> = {
  on_track:        { bg: 'rgba(63,185,80,0.15)',   color: 'var(--green)',  label: 'On Track' },
  needs_attention: { bg: 'rgba(210,153,34,0.2)',   color: 'var(--yellow)', label: 'Needs Attention' },
  completed:       { bg: 'rgba(88,166,255,0.15)',  color: 'var(--blue)',   label: 'Completed' },
}

export default function AiSummaryModal({ projectId, projectName, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
      .then(async res => {
        if (cancelled) return
        if (res.status === 503) throw new Error('AI service unavailable. Please try again.')
        if (res.status === 502) throw new Error('AI returned an unexpected response. Please try again.')
        if (!res.ok) throw new Error('Something went wrong. Please check your connection.')
        return res.json()
      })
      .then(data => {
        if (cancelled || !data) return
        setResult(data)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong. Please check your connection.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const health = result?.summary.health ?? 'on_track'
  const healthStyle = healthColors[health]

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
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          width: '100%', maxWidth: '480px',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>✦ AI Project Summary</span>
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, borderRadius: 4, background: 'transparent',
              border: 'none', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        <div style={{ padding: '24px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 14 }}>
              <div style={{
                width: 28, height: 28,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '12px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                Analyzing project health...
              </span>
            </div>
          )}

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--accent)', textAlign: 'center' }}>{error}</p>
          )}

          {result && !loading && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
                Project Summary
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: 16 }}>
                {projectName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Overall health</span>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px',
                  fontSize: '10px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: healthStyle.bg, color: healthStyle.color,
                }}>
                  {healthStyle.label}
                </span>
              </div>
              <p style={{
                fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7,
                padding: '16px', background: 'var(--surface-2)',
                borderRadius: '6px', borderLeft: '2px solid var(--accent)',
              }}>
                {result.summary.summary}
              </p>
            </>
          )}
        </div>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px', background: 'transparent',
              color: 'var(--text-2)', border: '1px solid var(--border)',
              borderRadius: '5px', fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
