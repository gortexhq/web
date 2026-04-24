'use client'

import { useEffect, useState } from 'react'
import type { Repo } from '@/lib/schema'
import type { GraphData } from '@/lib/types'
import { ThreeDStrata } from './Strata'
import { ThreeDGalaxies } from './Galaxies'
import { ThreeDCity } from './City'
import { ThreeDThumb } from './ThreeDThumb'

export type ThreeDMode = 'strata' | 'galaxies' | 'city'

const MODES: { id: ThreeDMode; label: string; hint: string }[] = [
  { id: 'galaxies', label: 'Galaxies', hint: 'Force-graph w/ perspective depth' },
  { id: 'strata',   label: 'Strata',   hint: 'Repos as planes · cross-repo rain' },
  { id: 'city',     label: 'City',     hint: 'Buildings = symbols · skybridges = contracts' },
]

export function Graph3D({
  graph, repos, filterRepos, filterKinds,
}: {
  graph: GraphData | null
  repos: Repo[]
  filterRepos: Set<string>
  filterKinds: Set<string>
}) {
  const [sub, setSub] = useState<ThreeDMode>('galaxies')

  useEffect(() => {
    const stored = localStorage.getItem('gortex:3d') as ThreeDMode | null
    if (stored && MODES.some((m) => m.id === stored)) setSub(stored)
  }, [])

  useEffect(() => {
    localStorage.setItem('gortex:3d', sub)
  }, [sub])

  const mode = MODES.find((m) => m.id === sub) ?? MODES[0]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="threeD-picker">
        <div className="threeD-picker-title">3D representation</div>
        <div className="threeD-picker-row">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`threeD-chip ${sub === m.id ? 'active' : ''}`}
              onClick={() => setSub(m.id)}
            >
              <ThreeDThumb mode={m.id} />
              <div className="threeD-chip-label">{m.label}</div>
            </button>
          ))}
        </div>
        <div className="threeD-picker-hint">{mode.hint}</div>
      </div>
      <div style={{ width: '100%', height: '100%' }}>
        {sub === 'strata'   && <ThreeDStrata   graph={graph} repos={repos} filterRepos={filterRepos} filterKinds={filterKinds} />}
        {sub === 'galaxies' && <ThreeDGalaxies graph={graph} repos={repos} filterRepos={filterRepos} filterKinds={filterKinds} />}
        {sub === 'city'     && <ThreeDCity     graph={graph} repos={repos} filterRepos={filterRepos} filterKinds={filterKinds} />}
      </div>
    </div>
  )
}
