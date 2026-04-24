'use client'

import { Icon } from '@/components/primitives/Icon'
import { useTweaks } from '@/lib/tweaks'
import { useDashboard } from '@/lib/hooks'

export function StatusBar() {
  const scope = useTweaks((s) => s.scope)
  const { data, error } = useDashboard()
  const nodes = data?.stats.total_nodes
  const edges = data?.stats.total_edges
  const repos = data?.stats.repos
  const caveats = data?.stats.caveats
  const version = data?.stats.version ?? ''

  return (
    <div className="statusbar">
      <span className={`seg ${error ? 'warn' : 'ok'}`}>
        <Icon name="dot" size={10} /> {error ? 'offline' : 'live · watch'}
      </span>
      <span className="sep">·</span>
      <span className="seg">
        nodes <b style={{ color: 'var(--fg-0)' }}>{nodes?.toLocaleString() ?? '—'}</b>
      </span>
      <span className="seg">
        edges <b style={{ color: 'var(--fg-0)' }}>{edges?.toLocaleString() ?? '—'}</b>
      </span>
      <span className="seg">
        repos <b style={{ color: 'var(--fg-0)' }}>{repos ?? '—'}</b>
      </span>
      <span className="seg warn">
        caveats <b style={{ color: 'var(--warn)' }}>{caveats ?? '—'}</b>
      </span>
      <span className="sep">·</span>
      <span className="seg">
        scope <b style={{ color: 'var(--fg-0)' }}>{scope === 'federated' ? 'all repos' : 'single'}</b>
      </span>
      <span className="spacer" />
      <span className="seg">{version}</span>
    </div>
  )
}
