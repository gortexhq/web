'use client'

import { Icon } from '@/components/primitives/Icon'
import { StackedBar } from '@/components/primitives/Charts'
import { useRepos } from '@/lib/hooks'

export function ServicesView() {
  const { data, loading, error, refetch } = useRepos()
  const repos = data ?? []
  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Services</h1>
          <div className="sub">
            {loading ? 'Loading…' : `${repos.length} indexed services · click to drill in`}
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
          Failed to load services: {error}
        </div>
      )}

      {!error && repos.length === 0 && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No repositories indexed yet.
        </div>
      )}

      <div style={{ padding: 18, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {repos.map((r) => (
            <div key={r.id + ':' + r.owner} className="card" style={{ padding: 14 }}>
              <div className="hstack" style={{ gap: 8 }}>
                <span style={{ width: 8, height: 28, borderRadius: 3, background: r.color }} />
                <div>
                  <div className="mono" style={{ fontSize: 14, color: 'var(--fg-0)' }}>{r.id}</div>
                  <div className="mono faint" style={{ fontSize: 11 }}>
                    {r.owner ? `${r.owner}/${r.id}` : r.id} · {r.lang || 'mixed'}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 12 }}>{r.nodes.toLocaleString()}</div>
                  <div className="mono faint" style={{ fontSize: 10.5 }}>nodes</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <StackedBar
                  parts={[
                    { value: r.funcs,      color: 'var(--k-function)' },
                    { value: r.methods,    color: 'var(--k-method)' },
                    { value: r.types,      color: 'var(--k-type)' },
                    { value: r.interfaces, color: 'var(--k-interface)' },
                    { value: r.vars,       color: 'var(--k-variable)' },
                  ]}
                  height={5}
                />
              </div>
              <div className="hstack" style={{ gap: 10, marginTop: 10, fontSize: 11, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
                <span>{r.funcs} fn</span>
                <span>{r.methods} meth</span>
                <span>{r.types} ty</span>
                <span>{r.interfaces} iface</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
