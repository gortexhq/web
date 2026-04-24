'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/primitives/Icon'
import { Kbd } from '@/components/primitives/Caveat'
import { useTweaks } from '@/lib/tweaks'
import { useCmdK } from '@/lib/cmdk'
import { useDashboard } from '@/lib/hooks'
import { PAGE_CRUMBS } from './nav'
import { pageIdFromPath } from './path'

export function Topbar() {
  const pathname = usePathname()
  const scope = useTweaks((s) => s.scope)
  const setScope = useTweaks((s) => s.set)
  const openCmdK = useCmdK((s) => s.setOpen)
  const { data } = useDashboard()
  const version = data?.stats.version ?? ''

  const pageId = pageIdFromPath(pathname)
  const crumbs = PAGE_CRUMBS[pageId] ?? PAGE_CRUMBS.dashboard

  return (
    <div className="topbar">
      <Link href="/" className="brand">
        <div className="logo">G</div>
        <span>Gortex</span>
        {version && <span className="kbd mono">{version}</span>}
      </Link>
      <div className="breadcrumbs">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className="sep">/</span>}
            {c.href ? (
              <Link href={c.href} className={`crumb ${i === crumbs.length - 1 ? 'current' : ''}`}>
                {c.label}
              </Link>
            ) : (
              <span className={`crumb ${i === crumbs.length - 1 ? 'current' : ''}`}>{c.label}</span>
            )}
          </span>
        ))}
      </div>
      <button className="cmdk" onClick={() => openCmdK(true)} type="button">
        <Icon name="search" size={13} />
        <span>Search symbols, files, flows, repos…</span>
        <span className="hint">
          <Kbd>⌘</Kbd> <Kbd>K</Kbd>
        </span>
      </button>
      <div className="topbar-right">
        <div className="scope-switch" role="tablist" aria-label="scope">
          <button
            type="button"
            className={scope === 'single' ? 'active' : ''}
            onClick={() => setScope('scope', 'single')}
          >
            Single repo
          </button>
          <button
            type="button"
            className={scope === 'federated' ? 'active' : ''}
            onClick={() => setScope('scope', 'federated')}
          >
            Federated
          </button>
        </div>
        <span className="pill">
          <span className="dot" /> Indexed · watch on
        </span>
      </div>
    </div>
  )
}
