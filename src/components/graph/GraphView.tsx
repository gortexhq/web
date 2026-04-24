'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { CaveatBadge } from '@/components/primitives/Caveat'
import { useTweaks } from '@/lib/tweaks'
import { useDashboard, useRepos, useGraph } from '@/lib/hooks'
import { GraphConstellation } from './views/Constellation'
import { Graph3D } from './views/Graph3D'
import type { Repo, KindCount } from '@/lib/schema'

type Mode = 'constellation' | '3d'

function RepoFilterPanel({
  repos,
  kinds,
  filtered,
  filterKinds,
  onToggle,
  onOnly,
  onToggleKind,
}: {
  repos: Repo[]
  kinds: KindCount[]
  filtered: Set<string>
  filterKinds: Set<string>
  onToggle: (id: string) => void
  onOnly: (id: string) => void
  onToggleKind: (kind: string) => void
}) {
  return (
    <div>
      <div
        className="sec-ti"
        style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}
      >
        Repositories
      </div>
      <div className="vstack" style={{ gap: 4 }}>
        {repos.map((r) => (
          <div key={r.id + ':' + r.owner} className="hstack" style={{ gap: 8, padding: '3px 0' }}>
            <input
              type="checkbox"
              checked={filtered.has(r.id)}
              onChange={() => onToggle(r.id)}
              aria-label={`Toggle ${r.id}`}
            />
            <span className="swatch" style={{ background: r.color }} />
            <span className="mono" style={{ fontSize: 11.5, flex: 1 }}>{r.id}</span>
            <span className="mono faint" style={{ fontSize: 10.5 }}>{r.nodes}</span>
            <button type="button" className="btn small ghost" onClick={() => onOnly(r.id)} style={{ padding: '0 4px' }}>
              only
            </button>
          </div>
        ))}
        {repos.length === 0 && (
          <div className="faint" style={{ fontSize: 11.5 }}>No repositories indexed.</div>
        )}
      </div>
      <div
        className="sec-ti"
        style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', margin: '14px 0 8px' }}
      >
        Node kinds
      </div>
      <div className="vstack" style={{ gap: 4 }}>
        {kinds.map((k) => (
          <label key={k.name} className="hstack" style={{ gap: 8, padding: '3px 0', fontSize: 11.5 }}>
            <input
              type="checkbox"
              checked={filterKinds.has(k.name)}
              onChange={() => onToggleKind(k.name)}
              aria-label={`Toggle kind ${k.name}`}
            />
            <span className={`swatch sw-${k.name}`} />
            <span className="mono" style={{ flex: 1 }}>{k.name}</span>
            <span className="mono faint" style={{ fontSize: 10.5 }}>{k.count.toLocaleString()}</span>
          </label>
        ))}
      </div>
      <div
        className="sec-ti"
        style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', margin: '14px 0 8px' }}
      >
        Caveats layer
      </div>
      <div className="vstack" style={{ gap: 4 }}>
        {(['deprecated', 'risk', 'hot', 'unowned', 'cycle', 'boundary'] as const).map((c) => (
          <label key={c} className="hstack" style={{ gap: 8, padding: '3px 0', fontSize: 11.5 }}>
            <input type="checkbox" defaultChecked={c === 'hot' || c === 'risk'} />
            <CaveatBadge kind={c} />
          </label>
        ))}
      </div>
    </div>
  )
}

export function GraphView() {
  const showMinimap = useTweaks((s) => s.showMinimap)
  const { data: repos, loading, error } = useRepos()
  const { data: dash } = useDashboard()
  const { data: graph, loading: graphLoading, error: graphError } = useGraph()
  const [mode, setMode] = useState<Mode>('constellation')
  const [filtered, setFiltered] = useState<Set<string>>(new Set())
  const [filterKinds, setFilterKinds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (repos && filtered.size === 0) {
      setFiltered(new Set(repos.map((r) => r.id)))
    }
  }, [repos, filtered.size])

  // Default kinds: everything except `file`. File nodes inflate the graph
  // without adding useful topology, so they start off; user can opt in.
  useEffect(() => {
    if (dash?.kinds && filterKinds.size === 0) {
      setFilterKinds(new Set(dash.kinds.filter((k) => k.name !== 'file').map((k) => k.name)))
    }
  }, [dash?.kinds, filterKinds.size])

  const toggle = (id: string) => {
    const n = new Set(filtered)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setFiltered(n)
  }
  const only = (id: string) => setFiltered(new Set([id]))
  const toggleKind = (kind: string) => {
    const n = new Set(filterKinds)
    if (n.has(kind)) n.delete(kind)
    else n.add(kind)
    setFilterKinds(n)
  }

  const repoList = repos ?? []
  const visibleRepos = repoList.filter((r) => !filtered.size || filtered.has(r.id))
  const kinds = dash?.kinds ?? []

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Graph explorer</h1>
          <div className="sub">
            {loading || graphLoading
              ? 'Loading graph…'
              : `${filtered.size} of ${repoList.length} repos · ${(graph?.nodes.length ?? dash?.stats.total_nodes ?? 0).toLocaleString()} nodes · ${(graph?.edges.length ?? dash?.stats.total_edges ?? 0).toLocaleString()} edges`}
          </div>
        </div>
      </div>
      {(error || graphError) && (
        <div style={{ padding: 22, color: 'var(--danger)', fontSize: 13 }}>
          Failed to load graph: {error ?? graphError}
        </div>
      )}
      <div className="graph-wrap">
        <div className="graph-side">
          <RepoFilterPanel
            repos={repoList}
            kinds={kinds}
            filtered={filtered}
            filterKinds={filterKinds}
            onToggle={toggle}
            onOnly={only}
            onToggleKind={toggleKind}
          />
        </div>
        <div className="graph-canvas">
          <div className="graph-toolbar">
            <div className="seg">
              <button type="button" className={mode === 'constellation' ? 'active' : ''} onClick={() => setMode('constellation')}>
                <Icon name="graph" size={12} /> Constellation
              </button>
              <button type="button" className={mode === '3d' ? 'active' : ''} onClick={() => setMode('3d')}>
                <Icon name="cube" size={12} /> 3D
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '100%' }}>
            {mode === 'constellation' && (
              <GraphConstellation
                graph={graph} repos={repoList}
                filterRepos={filtered} filterKinds={filterKinds}
              />
            )}
            {mode === '3d' && (
              <Graph3D
                graph={graph} repos={repoList}
                filterRepos={filtered} filterKinds={filterKinds}
              />
            )}
          </div>

          <div className="legend-box">
            <div className="hstack" style={{ gap: 6 }}><span className="swatch sw-function" /> function</div>
            <div className="hstack" style={{ gap: 6 }}><span className="swatch sw-type" /> type</div>
            <div className="hstack" style={{ gap: 6 }}><span className="swatch sw-interface" /> interface</div>
            <div className="hstack" style={{ gap: 6 }}><span className="swatch sw-method" /> method</div>
          </div>

          {showMinimap && (
            <div className="minimap">
              <svg viewBox="0 0 180 110" width="100%" height="100%">
                <rect x="0" y="0" width="180" height="110" fill="var(--bg-1)" />
                {repoList.map((r, i) => (
                  <circle
                    key={r.id + ':' + r.owner}
                    cx={20 + (i % 4) * 45}
                    cy={20 + Math.floor(i / 4) * 35}
                    r={2 + Math.log(Math.max(1, r.nodes)) * 0.8}
                    fill={r.color}
                    opacity="0.85"
                  />
                ))}
              </svg>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
