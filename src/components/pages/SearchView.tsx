'use client'

import { useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { Kbd } from '@/components/primitives/Caveat'
import { useInspector } from '@/lib/inspector'
import { useSymbolSearch } from '@/lib/hooks'

const FACETS = [
  'kind:function',
  'kind:interface',
  'kind:type',
  'kind:method',
  'has:tests',
]

export function SearchView() {
  const setSym = useInspector((s) => s.setSym)
  const [q, setQ] = useState('')
  const { data: results, loading, error } = useSymbolSearch(q, 50)

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Search symbols</h1>
          <div className="sub">Functions, types, methods, interfaces — BM25 ranked across all indexed repos</div>
        </div>
      </div>
      <div style={{ padding: 22, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div
            className="hstack"
            style={{
              flex: 1,
              background: 'var(--bg-2)',
              border: '1px solid var(--line-1)',
              borderRadius: 8,
              padding: '0 12px',
              height: 40,
            }}
          >
            <Icon name="search" size={14} />
            <input
              style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14, padding: '0 8px' }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. handleRequest   kind:interface repo:core-api"
              autoFocus
            />
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </div>
        <div className="hstack" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {FACETS.map((f) => (
            <span
              key={f}
              className="chip"
              style={{ cursor: 'pointer' }}
              onClick={() => setQ((cur) => (cur ? `${cur} ${f}` : f))}
            >
              {f}
            </span>
          ))}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, padding: 14 }}>
            Failed to search: {error}
          </div>
        )}

        {!q && (
          <div style={{ color: 'var(--fg-2)', fontSize: 13, padding: 14 }}>
            Type a query to search the indexed graph.
          </div>
        )}

        {q && (
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>Symbol</th>
                  <th>File</th>
                  <th className="num">Line</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="faint" style={{ padding: 14 }}>Searching…</td>
                  </tr>
                )}
                {!loading && results && results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="faint" style={{ padding: 14 }}>No matches.</td>
                  </tr>
                )}
                {(results ?? []).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() =>
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
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className={`swatch sw-${s.kind}`} />
                    </td>
                    <td>
                      <div className="mono" style={{ color: 'var(--fg-0)' }}>{s.name}</div>
                      <div className="mono faint" style={{ fontSize: 10.5 }}>{s.kind}</div>
                    </td>
                    <td className="mono-cell faint">{s.path}</td>
                    <td className="num">{s.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
