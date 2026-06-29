'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Nav() {
  const pathname = usePathname()
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [comingSoonTitle, setComingSoonTitle] = useState('')

  const isProjectsActive = pathname === '/' || pathname.startsWith('/projects')

  function openComingSoon(title: string) {
    setComingSoonTitle(title)
    setShowComingSoon(true)
  }

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: '56px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg)',
        zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'block' }}>
          <Image src="/logo.png" alt="blen" height={28} width={80} style={{ height: 28, width: 'auto' }} />
        </Link>
        <ul style={{ display: 'flex', gap: 0, listStyle: 'none', margin: 0, padding: 0 }}>
          <li>
            <Link
              href="/"
              style={{
                display: 'block',
                padding: '0 18px',
                height: '56px',
                lineHeight: '56px',
                color: isProjectsActive ? 'var(--text-1)' : 'var(--text-2)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                borderBottom: isProjectsActive ? '2px solid var(--accent)' : 'none',
              }}
            >
              Projects
            </Link>
          </li>
          <li>
            <button
              onClick={() => openComingSoon('Team')}
              style={{
                display: 'block',
                padding: '0 18px',
                height: '56px',
                lineHeight: '56px',
                color: 'var(--text-2)',
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Team
            </button>
          </li>
          <li>
            <button
              onClick={() => openComingSoon('Settings')}
              style={{
                display: 'block',
                padding: '0 18px',
                height: '56px',
                lineHeight: '56px',
                color: 'var(--text-2)',
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Settings
            </button>
          </li>
        </ul>
      </nav>

      {showComingSoon && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setShowComingSoon(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '480px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{comingSoonTitle}</span>
              <button
                onClick={() => setShowComingSoon(false)}
                style={{
                  width: 24, height: 24, borderRadius: 4,
                  background: 'transparent', border: 'none',
                  color: 'var(--text-3)', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🚧</span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Coming Soon</div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                This section is not yet available in this version of the application.
              </p>
            </div>
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowComingSoon(false)}
                style={{
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
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
