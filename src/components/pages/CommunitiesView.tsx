'use client'

import { Icon } from '@/components/primitives/Icon'
import { Meter } from '@/components/primitives/Charts'
import { useCommunities, useRepos } from '@/lib/hooks'

export function CommunitiesView() {
  const { data, loading, error, refetch } = useCommunities()
  const { data: repos } = useRepos()
  const communities = data?.communities ?? []
  const modularity = data?.modularity ?? 0

  const repoColor = (id: string) => repos?.find((r) => r.id === id)?.color || 'var(--accent)'

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Communities</h1>
          <div className="sub">
            {loading
              ? 'Detecting communities…'
              : `${communities.length} modules · modularity ${(modularity * 100).toFixed(0)}%`}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={refetch}>
            <Icon name="history" size={12} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 22, color: 'var(--danger)', fontSize: 13 }}>
          Failed to load communities: {error}
        </div>
      )}

      {!error && communities.length === 0 && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No communities detected. Community detection requires an indexed graph with at least a few connected modules.
        </div>
      )}

      <div
        style={{
          padding: 18,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 10,
        }}
      >
        {communities.map((c) => (
          <div key={c.id} className="card" style={{ padding: 14 }}>
            <div className="hstack" style={{ gap: 6 }}>
              <span
                style={{
                  width: 4,
                  height: 16,
                  borderRadius: 2,
                  background: repoColor(c.repo),
                  display: 'inline-block',
                }}
              />
              <span className="mono" style={{ fontSize: 14, color: 'var(--fg-0)' }}>{c.name}</span>
              {c.repo && <span className="tag-dim">{c.repo}</span>}
            </div>
            <div className="hstack" style={{ gap: 8, marginTop: 8, fontSize: 11.5, color: 'var(--fg-2)' }}>
              <span><Icon name="users" size={11} /> {c.symbols} symbols</span>
              <span><Icon name="file" size={11} /> {c.files} files</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="hstack" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-2)' }}>
                <span>cohesion</span>
                <span className="mono">{(c.cohesion * 100).toFixed(0)}%</span>
              </div>
              <Meter
                value={c.cohesion * 100}
                color={c.cohesion > 0.75 ? 'var(--ok)' : c.cohesion > 0.55 ? 'var(--warn)' : 'var(--danger)'}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
