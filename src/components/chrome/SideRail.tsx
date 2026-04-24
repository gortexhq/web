'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/primitives/Icon'
import { useTweaks } from '@/lib/tweaks'
import { useCmdK } from '@/lib/cmdk'
import { useDashboard } from '@/lib/hooks'
import { useInspector } from '@/lib/inspector'
import { usePins } from '@/lib/pins'
import { NAV, type NavItem } from './nav'
import { pageIdFromPath } from './path'

function NavLink({
  item,
  active,
  mini,
  onSearchClick,
  count,
}: {
  item: NavItem
  active: boolean
  mini: boolean
  onSearchClick: () => void
  count?: string | null
}) {
  const inner = mini ? (
    <Icon name={item.icon} size={16} />
  ) : (
    <>
      <Icon name={item.icon} size={14} />
      <span>{item.label}</span>
      {item.kbd ? (
        <span className="num mono">{item.kbd}</span>
      ) : count ? (
        <span className="num">{count}</span>
      ) : null}
    </>
  )
  if (item.id === 'search') {
    return (
      <button
        type="button"
        className={`nav-item ${active ? 'active' : ''}`}
        title={mini ? item.label : undefined}
        onClick={onSearchClick}
      >
        {inner}
      </button>
    )
  }
  return (
    <Link href={item.href} className={`nav-item ${active ? 'active' : ''}`} title={mini ? item.label : undefined}>
      {inner}
    </Link>
  )
}

export function SideRail() {
  const pathname = usePathname()
  const layout = useTweaks((s) => s.layout)
  const openCmdK = useCmdK((s) => s.setOpen)
  const pageId = pageIdFromPath(pathname)
  const { data } = useDashboard()
  const pins = usePins((s) => s.pins)
  const removePin = usePins((s) => s.remove)
  const setSym = useInspector((s) => s.setSym)

  const isActive = (id: string) => {
    if (id === 'dashboard') return pageId === 'dashboard'
    return pageId === id
  }

  // Per-link counts come from the live snapshot; missing data is shown
  // as a blank instead of a hardcoded number so the rail never lies.
  const counts: Record<string, string | null> = {
    graph: data?.stats.total_nodes != null ? data.stats.total_nodes.toLocaleString() : null,
    communities: null,
    processes: data?.processes != null ? `${data.processes.length}+` : null,
    contracts: null,
    services: data?.stats.repos != null ? String(data.stats.repos) : null,
    investigations: null,
    caveats: data?.stats.caveats != null ? String(data.stats.caveats) : null,
    guards: null,
  }

  if (layout === 'workspace') {
    return (
      <aside className="side mini">
        {NAV.map((n) => (
          <NavLink key={n.id} item={n} active={isActive(n.id)} mini onSearchClick={() => openCmdK(true)} />
        ))}
      </aside>
    )
  }

  if (layout === 'cmdk') {
    return <div className="side" style={{ display: 'none' }} />
  }

  return (
    <>
      <aside className="side rail">
        <div className="section-label">Explore</div>
        {NAV.slice(0, 3).map((n) => (
          <NavLink
            key={n.id}
            item={n}
            active={isActive(n.id)}
            mini={false}
            onSearchClick={() => openCmdK(true)}
            count={counts[n.id]}
          />
        ))}
        <div className="section-label">Understand</div>
        {NAV.slice(3, 7).map((n) => (
          <NavLink
            key={n.id}
            item={n}
            active={isActive(n.id)}
            mini={false}
            onSearchClick={() => openCmdK(true)}
            count={counts[n.id]}
          />
        ))}
        <div className="section-label">Investigate</div>
        {NAV.slice(7).map((n) => (
          <NavLink
            key={n.id}
            item={n}
            active={isActive(n.id)}
            mini={false}
            onSearchClick={() => openCmdK(true)}
            count={counts[n.id]}
          />
        ))}
        {pins.length > 0 && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line-1)', padding: '6px 0' }}>
            <div className="section-label">Pinned</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 6px' }}>
              {pins.map((p) => (
                <div key={p.id} className="hstack" style={{ gap: 4, padding: '3px 6px', borderRadius: 4 }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    style={{ flex: 1, justifyContent: 'flex-start', fontSize: 11, overflow: 'hidden' }}
                    onClick={() =>
                      setSym({
                        id: p.id,
                        kind: 'function',
                        name: p.name,
                        repo: p.repo,
                        file: p.id.split('::')[0] ?? '',
                        sig: '',
                        callers: 0,
                        callees: 0,
                        community: '',
                        caveats: [],
                      })
                    }
                    title={p.id}
                  >
                    <Icon name="pin" size={10} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => removePin(p.id)}
                    title="Unpin"
                    aria-label={`Unpin ${p.name}`}
                  >
                    <Icon name="close" size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div
          style={{
            marginTop: pins.length > 0 ? 0 : 'auto',
            padding: 10,
            borderTop: '1px solid var(--line-1)',
            fontSize: 11,
            color: 'var(--fg-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span>Nodes</span>
            <span className="mono">{data?.stats.total_nodes?.toLocaleString() ?? '—'}</span>
          </div>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span>Edges</span>
            <span className="mono">{data?.stats.total_edges?.toLocaleString() ?? '—'}</span>
          </div>
          <div className="hstack" style={{ justifyContent: 'space-between' }}>
            <span>Avg fan-out</span>
            <span className="mono">
              {data && data.stats.total_nodes > 0
                ? (data.stats.total_edges / data.stats.total_nodes).toFixed(1)
                : '—'}
            </span>
          </div>
        </div>
      </aside>
      <aside className="side mini-fallback">
        {NAV.map((n) => (
          <NavLink key={n.id} item={n} active={isActive(n.id)} mini onSearchClick={() => openCmdK(true)} />
        ))}
      </aside>
    </>
  )
}
