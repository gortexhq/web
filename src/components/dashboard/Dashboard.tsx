'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/primitives/Icon'
import { KindRing, HBar, StackedBar } from '@/components/primitives/Charts'
import { CaveatBadge } from '@/components/primitives/Caveat'
import { useDashboard } from '@/lib/hooks'
import { useTweaks } from '@/lib/tweaks'
import { scopeOf, type CodeScope } from '@/lib/utils'
import type { Repo, KindCount, LanguageCount, Caveat, Process, Activity } from '@/lib/schema'

const KIND_COLORS: Record<string, string> = {
  function: 'var(--k-function)',
  method: 'var(--k-method)',
  type: 'var(--k-type)',
  interface: 'var(--k-interface)',
  variable: 'var(--k-variable)',
  file: 'var(--k-file)',
  import: 'var(--k-import)',
  contract: 'var(--k-contract)',
  package: 'var(--k-package)',
}

const LANG_COLORS: Record<string, string> = {
  go: 'oklch(0.72 0.12 215)',
  dart: 'oklch(0.72 0.12 240)',
  typescript: 'oklch(0.72 0.15 255)',
  javascript: 'oklch(0.78 0.14 80)',
  swift: 'oklch(0.78 0.17 30)',
  objc: 'oklch(0.80 0.13 230)',
  c: 'oklch(0.68 0.11 260)',
  python: 'oklch(0.78 0.14 80)',
  ruby: 'oklch(0.72 0.16 15)',
  hcl: 'oklch(0.78 0.14 300)',
  yaml: 'oklch(0.78 0.14 300)',
  json: 'oklch(0.78 0.14 80)',
  markdown: 'oklch(0.70 0.01 252)',
  html: 'oklch(0.72 0.16 15)',
  css: 'oklch(0.72 0.17 310)',
}

function langColor(name: string): string {
  return LANG_COLORS[name] ?? 'oklch(0.55 0.02 252)'
}

function Kpi({
  label,
  value,
  delta,
  deltaClass,
}: {
  label: string
  value: string
  delta?: string
  deltaClass?: string
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && <div className={`delta ${deltaClass ?? ''}`}>{delta}</div>}
    </div>
  )
}

function RepoCard({ r }: { r: Repo }) {
  const kinds = [
    { label: 'functions',  value: r.funcs,      color: 'var(--k-function)' },
    { label: 'methods',    value: r.methods,    color: 'var(--k-method)' },
    { label: 'types',      value: r.types,      color: 'var(--k-type)' },
    { label: 'interfaces', value: r.interfaces, color: 'var(--k-interface)' },
    { label: 'variables',  value: r.vars,       color: 'var(--k-variable)' },
  ]
  return (
    <div className="repo-card">
      <div className="repo-hd">
        <span style={{ background: r.color, width: 6, height: 18, borderRadius: 2, display: 'inline-block' }} />
        <div>
          <div className="repo-name">{r.id}</div>
          <div className="repo-owner mono">{r.owner ? `${r.owner}/${r.id}` : r.id}</div>
        </div>
        <div className="repo-stats">
          <div>{r.nodes.toLocaleString()} nodes</div>
          <div style={{ color: 'var(--fg-3)' }}>{r.edges.toLocaleString()} edges</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 11 }}>
        {kinds.map((k) => (
          <div key={k.label} className="hstack" style={{ gap: 4 }}>
            <span className="swatch" style={{ background: k.color }} />
            <span className="mono" style={{ color: 'var(--fg-1)' }}>{k.value}</span>
            <span className="faint">{k.label}</span>
          </div>
        ))}
      </div>
      <div className="kind-bar">
        <div style={{ flex: r.funcs,      background: 'var(--k-function)' }} />
        <div style={{ flex: r.methods,    background: 'var(--k-method)' }} />
        <div style={{ flex: r.types,      background: 'var(--k-type)' }} />
        <div style={{ flex: r.interfaces, background: 'var(--k-interface)' }} />
        <div style={{ flex: r.vars,       background: 'var(--k-variable)' }} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div className="mono faint" style={{ fontSize: 10.5 }}>
          {r.files} files · {r.lang}
        </div>
      </div>
    </div>
  )
}

function GraphPulse({ kinds }: { kinds: KindCount[] }) {
  // Pulse uses the live kind palette; positions are deterministic so the
  // visual stays stable across reloads, but the colours follow whatever
  // kinds the indexed graph actually contains.
  const colors = useMemo(() => {
    const c = kinds.map((k) => KIND_COLORS[k.name] ?? 'var(--accent)').filter(Boolean)
    return c.length > 0 ? c : ['var(--accent)']
  }, [kinds])
  const nodes = useMemo(() => {
    const arr: { x: number; y: number; size: number; color: string }[] = []
    const seed = (n: number) => Math.abs((Math.sin(n * 12.9898) * 43758.5453) % 1)
    for (let i = 0; i < 64; i++) {
      const r = 60 + seed(i) * 90
      const t = (i / 64) * Math.PI * 2 + seed(i + 1)
      arr.push({
        x: 200 + Math.cos(t) * r + (seed(i + 2) - 0.5) * 20,
        y: 110 + Math.sin(t) * r * 0.65 + (seed(i + 3) - 0.5) * 15,
        size: 2 + seed(i + 4) * 4,
        color: colors[i % colors.length],
      })
    }
    return arr
  }, [colors])
  return (
    <svg viewBox="0 0 400 220" width="100%" height="220" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="pulse-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="110" r="90" fill="url(#pulse-glow)" />
      {nodes.map((n, i) =>
        nodes.slice(i + 1, i + 3).map((m, j) => (
          <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="var(--line-2)" strokeWidth="0.4" opacity="0.45" />
        )),
      )}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.size} fill={n.color} opacity="0.9" />
      ))}
    </svg>
  )
}

function ActivityFeed({ events }: { events: Activity[] }) {
  if (events.length === 0) {
    return (
      <div className="faint" style={{ fontSize: 12, padding: '12px 0' }}>
        No recent activity. Watch mode may be off, or no files have changed since the server started.
      </div>
    )
  }
  return (
    <div className="vstack" style={{ gap: 0 }}>
      {events.map((a, i) => {
        const t = formatTimeAgo(a.timestamp)
        const kind: 'warn' | 'ok' | 'info' = a.kind === 'deleted' ? 'warn' : a.kind === 'created' ? 'ok' : 'info'
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '70px 16px 1fr',
              alignItems: 'start',
              gap: 8,
              padding: '7px 0',
              borderBottom: i < events.length - 1 ? '1px dashed var(--line-1)' : 'none',
              fontSize: 12,
            }}
          >
            <span className="mono faint" style={{ fontSize: 11 }}>{t}</span>
            <span
              style={{
                color: kind === 'warn' ? 'var(--warn)' : kind === 'ok' ? 'var(--ok)' : 'var(--fg-2)',
                marginTop: 2,
              }}
            >
              <Icon name={kind === 'warn' ? 'warn' : kind === 'ok' ? 'check' : 'dot'} size={12} />
            </span>
            <span>
              <span className="mono" style={{ color: 'var(--fg-2)', marginRight: 6 }}>{a.kind}</span>
              <span className="mono">{a.file_path}</span>
              <span className="faint mono" style={{ marginLeft: 6 }}>
                +{a.nodes_added}/-{a.nodes_removed} n · +{a.edges_added}/-{a.edges_removed} e
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function formatTimeAgo(ts: string): string {
  const t = new Date(ts).getTime()
  if (!t) return ts
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function CaveatsPreview({ caveats, onOpen }: { caveats: Caveat[]; onOpen: () => void }) {
  if (caveats.length === 0) {
    return (
      <div className="faint" style={{ fontSize: 12, padding: 8 }}>
        No caveats detected. Index a repository or wait for analyse to run.
      </div>
    )
  }
  return (
    <div className="vstack" style={{ gap: 6 }}>
      {caveats.slice(0, 5).map((c, i) => (
        <div
          key={`${c.id}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '96px 1fr auto',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            border: '1px solid var(--line-1)',
            borderRadius: 6,
            background: 'var(--bg-1)',
            cursor: 'pointer',
          }}
          onClick={onOpen}
        >
          <CaveatBadge kind={c.severity} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5 }}>{c.title}</div>
            <div className="mono faint nowrap" style={{ fontSize: 11 }}>{c.symbol}</div>
          </div>
          <div className="mono faint" style={{ fontSize: 11, textAlign: 'right' }}>
            <div>{c.owner || '—'}</div>
            <div style={{ color: 'var(--fg-3)' }}>{c.age || ''}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProcessPreview({ processes, onOpen }: { processes: Process[]; onOpen: () => void }) {
  if (processes.length === 0) {
    return (
      <div className="faint" style={{ fontSize: 12, padding: 14 }}>
        No processes discovered yet.
      </div>
    )
  }
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Flow</th>
          <th>Repos</th>
          <th className="num">Steps</th>
          <th className="num">Score</th>
        </tr>
      </thead>
      <tbody>
        {processes.slice(0, 6).map((p) => (
          <tr key={p.id} onClick={onOpen} style={{ cursor: 'pointer' }}>
            <td>
              <div className="hstack" style={{ gap: 6 }}>
                <span
                  className={`cav ${p.risk === 'risk' ? 'risk' : p.risk === 'warn' ? 'deprecated' : ''}`}
                  style={{ opacity: p.risk === 'ok' ? 0 : 1 }}
                >
                  {p.risk}
                </span>
                <span className="mono">{p.name}</span>
              </div>
              <div className="mono faint nowrap" style={{ fontSize: 10.5, marginTop: 2 }}>{p.entry}</div>
            </td>
            <td>
              <div className="hstack" style={{ gap: 4, flexWrap: 'wrap' }}>
                {p.crosses.map((r, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    {i > 0 && <span className="faint mono" style={{ fontSize: 10 }}>→</span>}
                    <span className="tag-dim">{r}</span>
                  </span>
                ))}
              </div>
            </td>
            <td className="num">{p.steps}</td>
            <td className="num">{p.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function severityCount(caveats: Caveat[], sev: Caveat['severity'][]): number {
  return caveats.filter((c) => sev.includes(c.severity)).length
}

export function Dashboard() {
  const router = useRouter()
  const { data, loading, error, refetch } = useDashboard()
  const scope = useTweaks((s) => s.scope)
  // Separate from the global workspace `scope` — this one partitions
  // the caveats card into first-party code ("yours"), test fixtures,
  // and vendored dependencies. "yours" is the default because the raw
  // list is dominated by upstream hotspots (Pods, sqlite, node_modules)
  // and test-file asserts that the user can't act on.
  const [caveatScope, setCaveatScope] = useState<CodeScope>('yours')

  if (loading && !data) {
    return (
      <>
        <div className="page-hd">
          <div>
            <h1>Control Room</h1>
            <div className="sub">Loading dashboard…</div>
          </div>
        </div>
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        <div className="page-hd">
          <div>
            <h1>Control Room</h1>
            <div className="sub" style={{ color: 'var(--danger)' }}>{error}</div>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={refetch}>
              <Icon name="bolt" size={12} /> Retry
            </button>
          </div>
        </div>
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          Make sure the gortex server is running on{' '}
          <span className="mono">{process.env.NEXT_PUBLIC_GORTEX_URL || 'http://localhost:4747'}</span>.
        </div>
      </>
    )
  }

  const snap = data!
  const langRows = snap.languages.slice(0, 8).map((l: LanguageCount) => ({
    label: l.name,
    value: l.count,
    color: langColor(l.name),
  }))
  const langSegs = snap.languages.map((l) => ({
    value: l.count,
    color: langColor(l.name),
    label: l.name,
  }))
  const kindRows = snap.kinds.map((k: KindCount) => ({
    label: k.name,
    value: k.count,
    color: KIND_COLORS[k.name] ?? 'var(--accent)',
    display: k.count.toLocaleString(),
  }))
  const ringSegs = snap.kinds.map((k) => ({
    value: k.count,
    color: KIND_COLORS[k.name] ?? 'var(--accent)',
  }))
  const cavCounts = { yours: 0, tests: 0, deps: 0 }
  for (const c of snap.caveats) cavCounts[scopeOf(c.symbol)]++
  const scopedCaveats = caveatScope === 'all'
    ? snap.caveats
    : snap.caveats.filter((c) => scopeOf(c.symbol) === caveatScope)
  const critical = severityCount(scopedCaveats, ['risk'])
  const warn = severityCount(scopedCaveats, ['hot', 'cycle', 'boundary'])
  const other = scopedCaveats.length - critical - warn

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Control Room</h1>
          <div className="sub">
            Gortex knowledge graph · {snap.stats.repos} repo{snap.stats.repos === 1 ? '' : 's'} ·{' '}
            {snap.activity[0] ? `last change ${formatTimeAgo(snap.activity[0].timestamp)} ago` : 'no recent activity'}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={refetch}>
            <Icon name="history" size={12} /> Refresh
          </button>
          <button type="button" className="btn primary" onClick={() => router.push('/investigations')}>
            <Icon name="flask" size={12} /> Open investigation
          </button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div className="kpi-row" style={{ paddingTop: 14 }}>
          <Kpi label="Nodes" value={snap.stats.total_nodes.toLocaleString()} />
          <Kpi label="Edges" value={snap.stats.total_edges.toLocaleString()} />
          <Kpi
            label="Caveats"
            value={snap.stats.caveats.toString()}
            delta={critical > 0 ? `${critical} critical` : 'none critical'}
            deltaClass={critical > 0 ? 'down' : 'up'}
          />
          <Kpi
            label="Avg fan-out"
            value={
              snap.stats.total_nodes > 0
                ? (snap.stats.total_edges / snap.stats.total_nodes).toFixed(1) + '×'
                : '—'
            }
          />
        </div>

        <div className="hero-grid">
          <div className="card" style={{ gridRow: '1 / span 2' }}>
            <div className="card-hd">
              <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="ti">Knowledge graph</span>
                {snap.kinds.slice(0, 3).map((k) => (
                  <span key={k.name} className="chip">
                    <span className="swatch" style={{ background: KIND_COLORS[k.name] ?? 'var(--accent)' }} />{' '}
                    {k.count.toLocaleString()} {k.name}
                  </span>
                ))}
              </div>
              <button type="button" className="btn small ghost" onClick={() => router.push('/graph')}>
                <Icon name="expand" size={11} /> Open Graph
              </button>
            </div>
            <GraphPulse kinds={snap.kinds} />
            <div className="card-bd" style={{ paddingTop: 4 }}>
              <div className="legend">
                {snap.kinds.slice(0, 8).map((k) => (
                  <span key={k.name} className="lg">
                    <span className="swatch" style={{ background: KIND_COLORS[k.name] ?? 'var(--accent)' }} /> {k.name}{' '}
                    <span className="mono faint">{k.count.toLocaleString()}</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
                <button type="button" className="btn" onClick={() => router.push('/processes')}>
                  <Icon name="route" size={12} /> Trace a flow
                </button>
                <button type="button" className="btn" onClick={() => router.push('/graph')}>
                  <Icon name="fork" size={12} /> Blast radius
                </button>
                <button type="button" className="btn" onClick={() => router.push('/contracts')}>
                  <Icon name="plug" size={12} /> Check contracts
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="ti">Node kinds</span>
              <span className="mono faint" style={{ fontSize: 11 }}>{snap.stats.total_nodes.toLocaleString()} total</span>
            </div>
            <div className="card-bd" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'center' }}>
              <KindRing
                segments={ringSegs}
                innerLabel="nodes"
                innerValue={
                  snap.stats.total_nodes >= 1000
                    ? `${(snap.stats.total_nodes / 1000).toFixed(1)}k`
                    : `${snap.stats.total_nodes}`
                }
              />
              <HBar rows={kindRows} />
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="ti">Languages</span>
              <span className="mono faint" style={{ fontSize: 11 }}>{snap.languages.length} detected</span>
            </div>
            <div className="card-bd">
              <div style={{ marginBottom: 10 }}>
                <StackedBar parts={langSegs} height={6} />
              </div>
              <HBar rows={langRows} />
            </div>
          </div>

          <div className="card wide">
            <div className="card-hd">
              <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="ti">Caveats &amp; landmines</span>
                {critical > 0 && <span className="chip" style={{ color: 'var(--danger)' }}>{critical} critical</span>}
                {warn > 0 && <span className="chip" style={{ color: 'var(--warn)' }}>{warn} warn</span>}
                {other > 0 && <span className="chip faint">{other} other</span>}
              </div>
              <div className="hstack" style={{ gap: 8 }}>
                <div className="seg" style={{ height: 26 }}>
                  {(['yours', 'tests', 'deps', 'all'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={caveatScope === s ? 'active' : ''}
                      onClick={() => setCaveatScope(s)}
                      style={{ textTransform: 'capitalize', fontSize: 11 }}
                    >
                      {s}{' '}
                      <span className="mono faint" style={{ marginLeft: 4 }}>
                        {s === 'all' ? snap.caveats.length : cavCounts[s]}
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" className="btn small ghost" onClick={() => router.push('/caveats')}>
                  <Icon name="expand" size={11} /> View all
                </button>
              </div>
            </div>
            <div className="card-bd">
              <CaveatsPreview caveats={scopedCaveats} onOpen={() => router.push('/caveats')} />
            </div>
          </div>

          <div className="card wide">
            <div className="card-hd">
              <span className="ti">Top processes</span>
              <button type="button" className="btn small ghost" onClick={() => router.push('/processes')}>
                <Icon name="expand" size={11} /> View all
              </button>
            </div>
            <ProcessPreview processes={snap.processes} onOpen={() => router.push('/processes')} />
          </div>

          <div className="card wide" style={{ padding: 0 }}>
            <div className="card-hd">
              <span className="ti">Repositories</span>
              <span className="mono faint" style={{ fontSize: 11 }}>
                {snap.stats.repos} indexed · {scope === 'federated' ? 'federated' : 'single repo'} view
              </span>
            </div>
            <div className="card-bd" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div className="repo-grid">
                {snap.repos.slice(0, 6).map((r) => (
                  <RepoCard key={r.id + ':' + r.owner} r={r} />
                ))}
              </div>
              <div className="card" style={{ background: 'var(--bg-1)' }}>
                <div className="card-hd">
                  <span className="ti">Activity</span>
                  <span className="mono faint" style={{ fontSize: 11 }}>last {snap.activity.length}</span>
                </div>
                <div className="card-bd" style={{ paddingTop: 4 }}>
                  <ActivityFeed events={snap.activity} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

