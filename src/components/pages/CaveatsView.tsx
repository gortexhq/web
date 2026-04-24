'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { CaveatBadge } from '@/components/primitives/Caveat'
import { useCaveats } from '@/lib/hooks'
import { useInspector } from '@/lib/inspector'
import { adviceFor } from '@/lib/caveat-advice'
import { scopeOf, type CodeScope } from '@/lib/utils'
import type { Caveat } from '@/lib/schema'

const TABS = ['all', 'risk', 'deprecated', 'hot', 'unowned', 'cycle', 'boundary'] as const
type Tab = (typeof TABS)[number]

// Scope partitions caveats into first-party code ("yours"), test
// fixtures, and vendored/third-party dependencies. Default is "yours"
// because /caveats is dominated by upstream hotspots (Pods, sqlite,
// node_modules) that users can't fix and tests they don't want
// flagged.
const SCOPES: CodeScope[] = ['yours', 'tests', 'deps', 'all']

export function CaveatsView() {
  const { data, loading, error, refetch } = useCaveats()
  const setSym = useInspector((s) => s.setSym)
  const [tab, setTab] = useState<Tab>('all')
  const [scope, setScope] = useState<CodeScope>('yours')
  const all = data ?? []
  const counts = useMemo(() => {
    const c = { yours: 0, tests: 0, deps: 0 }
    for (const cav of all) c[scopeOf(cav.symbol)]++
    return c
  }, [all])
  const scoped = useMemo(() => {
    if (scope === 'all') return all
    return all.filter((c: Caveat) => scopeOf(c.symbol) === scope)
  }, [all, scope])
  const filtered = tab === 'all' ? scoped : scoped.filter((c: Caveat) => c.severity === tab)

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Caveats</h1>
          <div className="sub">
            {loading
              ? 'Aggregating hotspots, dead code, cycles, guard violations…'
              : `${all.length} landmines · severity-ranked`}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={refetch}>
            <Icon name="history" size={12} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 22px 0', borderBottom: '1px solid var(--line-1)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="seg" style={{ height: 30 }}>
          {SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              className={scope === s ? 'active' : ''}
              onClick={() => setScope(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}{' '}
              <span className="mono faint" style={{ marginLeft: 6 }}>
                {s === 'all' ? all.length : counts[s]}
              </span>
            </button>
          ))}
        </div>
        <div className="seg" style={{ height: 30, flexWrap: 'wrap' }}>
          {TABS.map((c) => (
            <button
              key={c}
              type="button"
              className={tab === c ? 'active' : ''}
              onClick={() => setTab(c)}
              style={{ textTransform: 'capitalize' }}
            >
              {c}{' '}
              <span className="mono faint" style={{ marginLeft: 6 }}>
                {c === 'all' ? scoped.length : scoped.filter((x: Caveat) => x.severity === c).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 22, color: 'var(--danger)', fontSize: 13 }}>
          Failed to load caveats: {error}
        </div>
      )}

      {!error && all.length === 0 && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No caveats detected. Re-index a repository or check that <code>analyze</code> tools are registered.
        </div>
      )}

      <div style={{ padding: 18, overflow: 'auto', display: 'grid', gap: 8 }}>
        {filtered.map((c: Caveat, i: number) => (
          <button
            key={`${c.id}-${i}`}
            type="button"
            className="card"
            onClick={() =>
              setSym({
                id: c.symbol,
                kind: c.kind || 'function',
                name: c.symbol.split('::').pop() || c.symbol,
                repo: c.repo_prefix ?? '',
                file: c.file_path ?? (c.symbol.split('::')[0] ?? ''),
                sig: '',
                callers: c.fan_in ?? 0,
                callees: 0,
                community: '',
                caveats: [c.severity],
              })
            }
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr auto',
              gap: 14,
              padding: 14,
              alignItems: 'start',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div>
              <CaveatBadge kind={c.severity} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, color: 'var(--fg-0)' }}>{c.title}</div>
              <div className="mono faint" style={{ fontSize: 11, marginTop: 2 }}>{c.symbol}</div>
              {c.desc && <div style={{ fontSize: 12, color: 'var(--fg-1)', marginTop: 8 }}>{c.desc}</div>}
              {(c.fan_in || c.caller_repos?.length) && (
                <div className="hstack" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap', fontSize: 11 }}>
                  {c.fan_in ? (
                    <span className="chip" title={`${c.fan_in} call sites reference this symbol`}>
                      <span className="mono">fan-in {c.fan_in}</span>
                    </span>
                  ) : null}
                  {c.external_callers ? (
                    <span
                      className="chip"
                      style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                      title={`${c.external_callers} callers outside ${c.repo_prefix || 'this repo'} — changes here cross repo boundaries`}
                    >
                      <span className="mono">
                        {c.external_callers} external · {c.caller_repos?.length ?? 0} repo
                        {(c.caller_repos?.length ?? 0) === 1 ? '' : 's'}
                      </span>
                    </span>
                  ) : null}
                  {c.caller_repos?.slice(0, 3).map((r) => (
                    <span key={r} className="chip mono" style={{ opacity: 0.75 }}>
                      {r}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 10, fontStyle: 'italic' }}>
                {adviceFor(c.severity)}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11 }}>
              {c.repo_prefix && (
                <div className="hstack" style={{ justifyContent: 'flex-end', gap: 6 }}>
                  <Icon name="cube" size={11} />
                  <span className="mono">{c.repo_prefix}</span>
                </div>
              )}
              {c.owner && (
                <div className="hstack" style={{ justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
                  <Icon name="owner" size={11} />
                  <span className="mono">{c.owner}</span>
                </div>
              )}
              {c.age && <div className="faint mono" style={{ marginTop: 4 }}>{c.age}</div>}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
