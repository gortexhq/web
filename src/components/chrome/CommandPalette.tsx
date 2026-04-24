'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/primitives/Icon'
import { useCmdK } from '@/lib/cmdk'
import { useInspector } from '@/lib/inspector'
import { useSymbolSearch, useRecentSearches } from '@/lib/hooks'

const JUMPS = [
  { k: 'Dashboard',     sub: 'control room',          meta: 'G D', href: '/' },
  { k: 'Graph explorer',sub: '4 view modes',          meta: 'G G', href: '/graph' },
  { k: 'Investigation', sub: 'cross-repo flow trace',  meta: 'G I', href: '/investigations' },
  { k: 'Caveats',       sub: 'severity-ranked',        meta: 'G C', href: '/caveats' },
]

export function CommandPalette() {
  const open = useCmdK((s) => s.open)
  const setOpen = useCmdK((s) => s.setOpen)
  const setSym = useInspector((s) => s.setSym)
  const router = useRouter()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const { data: results, loading } = useSymbolSearch(q, 12)
  const { recents, push: pushRecent } = useRecentSearches()

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) return
    function h(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => i + 1)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="cmd-modal-scrim" onClick={() => setOpen(false)}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cmd-input"
          placeholder="Search symbols, files, flows, contracts…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setIdx(0)
          }}
        />
        {!q && (
          <div className="cmd-section">
            <div className="sec-ti">Jump to</div>
            {JUMPS.map((r, i) => (
              <div
                key={i}
                className="cmd-row"
                onClick={() => {
                  router.push(r.href)
                  setOpen(false)
                }}
              >
                <Icon name="arrowr" size={12} />
                <div>
                  <div className="k">{r.k}</div>
                  <div className="sub">{r.sub}</div>
                </div>
                <span className="meta">{r.meta}</span>
              </div>
            ))}
            {recents.length > 0 && (
              <>
                <div className="sec-ti">Recent</div>
                {recents.map((r, i) => (
                  <div key={i} className="cmd-row" onClick={() => setQ(r.q)}>
                    <Icon name="history" size={12} />
                    <div>
                      <div className="k mono">{r.q}</div>
                      <div className="sub">
                        {r.kind} · {r.hits} hits
                      </div>
                    </div>
                    <span className="meta">↵</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {q && (
          <div className="cmd-section">
            <div className="sec-ti">
              Symbols ({loading ? '…' : results?.length ?? 0})
            </div>
            {(results ?? []).map((s, i) => (
              <div
                key={s.id}
                className={`cmd-row ${i === idx ? 'active' : ''}`}
                onClick={() => {
                  setSym({
                    id: s.id,
                    kind: s.kind,
                    name: s.name,
                    repo: s.id.split(':')[0] ?? '',
                    file: `${s.path}:${s.line}`,
                    sig: s.sig ?? '',
                    callers: 0,
                    callees: 0,
                    community: '',
                    caveats: [],
                  })
                  pushRecent({ q, kind: s.kind, hits: results?.length ?? 0 })
                  setOpen(false)
                }}
              >
                <span className={`swatch sw-${s.kind}`} />
                <div>
                  <div className="k mono">{s.name}</div>
                  <div className="sub">{s.path}:{s.line}</div>
                </div>
                <span className="meta">{s.kind}</span>
              </div>
            ))}
            {!loading && (!results || results.length === 0) && (
              <div className="cmd-row" style={{ cursor: 'default' }}>
                <span />
                <div>
                  <div className="k">No matches.</div>
                  <div className="sub">Try a different query or use facets like <code>kind:type</code>.</div>
                </div>
                <span />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
