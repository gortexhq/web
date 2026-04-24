'use client'

import { Icon } from '@/components/primitives/Icon'
import { useGuards } from '@/lib/hooks'

export function GuardsView() {
  const { data, loading, error, refetch } = useGuards()
  const guards = data ?? []
  const violated = guards.filter((g) => g.status === 'violated').length
  const warn = guards.filter((g) => g.status === 'warn').length

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Guards</h1>
          <div className="sub">
            {loading
              ? 'Evaluating guards from .gortex.yaml…'
              : `${guards.length} rules · ${violated} violated · ${warn} warn`}
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
          Failed to load guards: {error}
        </div>
      )}

      {!error && guards.length === 0 && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No guards configured. Add rules to <code>.gortex.yaml</code> to enforce architecture invariants.
        </div>
      )}

      {guards.length > 0 && (
        <div style={{ padding: '18px 22px', overflow: 'auto' }}>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Kind</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th className="num">Hits</th>
                </tr>
              </thead>
              <tbody>
                {guards.map((g) => (
                  <tr key={g.id}>
                    <td className="mono-cell">{g.name}</td>
                    <td>
                      <span className="tag-dim">{g.kind}</span>
                    </td>
                    <td className="mono-cell faint">{g.scope}</td>
                    <td>
                      {g.status === 'violated' && <span className="cav risk">violated</span>}
                      {g.status === 'warn' && <span className="cav deprecated">warning</span>}
                      {g.status === 'ok' && <span className="chip" style={{ color: 'var(--ok)' }}>passing</span>}
                    </td>
                    <td className="num">{g.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
