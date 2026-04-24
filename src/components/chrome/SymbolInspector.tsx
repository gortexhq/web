'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { CaveatBadge } from '@/components/primitives/Caveat'
import { useInspector } from '@/lib/inspector'
import { usePins } from '@/lib/pins'
import { useUsages, useDependencies } from '@/lib/hooks'
import { adviceFor } from '@/lib/caveat-advice'
import type { Caveat } from '@/lib/schema'

export function SymbolInspector() {
  const sym = useInspector((s) => s.sym)
  const setSym = useInspector((s) => s.setSym)
  const togglePin = usePins((s) => s.toggle)
  const isPinned = usePins((s) => (sym ? s.pins.some((p) => p.id === sym.id) : false))
  const [copied, setCopied] = useState(false)
  const usages = useUsages(sym?.id ?? null)
  const deps = useDependencies(sym?.id ?? null)

  // Must run every render (Rules of Hooks): keep this before the early
  // return for the null-sym placeholder below. Reads usages.data
  // directly so it doesn't depend on any post-return locals.
  const callersByRepo = useMemo(() => {
    const nodes = usages.data?.nodes ?? []
    const map = new Map<string, typeof nodes>()
    for (const n of nodes) {
      const key = n.repo_prefix || '(this repo)'
      const bucket = map.get(key) ?? []
      bucket.push(n)
      map.set(key, bucket)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [usages.data])

  if (!sym) {
    return (
      <div style={{ padding: 20, color: 'var(--fg-2)', fontSize: 12.5 }}>
        <div className="section-label" style={{ padding: 0, marginBottom: 10 }}>Inspector</div>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--fg-3)' }}>
          <Icon name="search" size={18} />
          <div style={{ marginTop: 8 }}>Select a symbol, edge, or flow step</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Details appear here without leaving the canvas</div>
        </div>
      </div>
    )
  }

  const callerNodes = usages.data?.nodes ?? []
  const calleeNodes = deps.data?.nodes ?? []

  const ownRepo = sym.repo
  const externalRepoCount = callersByRepo.filter(
    ([repo]) => repo !== '(this repo)' && repo !== ownRepo,
  ).length

  const onCopyId = async () => {
    try {
      await navigator.clipboard.writeText(sym.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard blocked — fall through, the button still visually toggles
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }

  const onTogglePin = () => togglePin({ id: sym.id, name: sym.name, repo: sym.repo })

  return (
    <div>
      <div className="sym-hd">
        <div className="hstack" style={{ justifyContent: 'space-between' }}>
          <span className="kind">
            <span className={`swatch sw-${sym.kind}`} style={{ marginRight: 6 }} />
            {sym.kind}
          </span>
          <button type="button" className="btn small ghost" onClick={() => setSym(null)}>
            <Icon name="close" size={11} />
          </button>
        </div>
        <div className="name">{sym.name}</div>
        <div className="path">
          {sym.repo} · {sym.file}
        </div>
        {sym.caveats?.length > 0 && (
          <div className="hstack" style={{ marginTop: 8, gap: 4, flexWrap: 'wrap' }}>
            {sym.caveats.map((c) => (
              <CaveatBadge key={c} kind={c} />
            ))}
          </div>
        )}
        <div className="hstack" style={{ gap: 6, marginTop: 10 }}>
          <Link
            className="btn small"
            href={`/graph?focus=${encodeURIComponent(sym.id)}`}
            title="Focus this symbol on the graph view"
          >
            <Icon name="file" size={11} /> Open in graph
          </Link>
          <button
            type="button"
            className={`btn small ${copied ? '' : 'ghost'}`}
            onClick={onCopyId}
            title="Copy the fully-qualified node id to the clipboard"
          >
            <Icon name={copied ? 'check' : 'copy'} size={11} /> {copied ? 'Copied' : 'Copy id'}
          </button>
          <button
            type="button"
            className={`btn small ${isPinned ? '' : 'ghost'}`}
            onClick={onTogglePin}
            title={isPinned ? 'Remove from pinned list' : 'Pin to the side rail'}
          >
            <Icon name="pin" size={11} /> {isPinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
        {sym.caveats?.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 10, fontStyle: 'italic' }}>
            {adviceFor(sym.caveats[0] as Caveat['severity'])}
          </div>
        )}
      </div>

      {sym.sig && (
        <div className="sym-section">
          <div className="sec-ti">Signature</div>
          <pre className="code" style={{ margin: 0 }}>{sym.sig}</pre>
        </div>
      )}

      <div className="sym-section">
        <div className="sec-ti">
          <span>Callers</span>
          <span className="mono faint" style={{ fontSize: 11 }}>
            {usages.loading
              ? '…'
              : externalRepoCount > 0
                ? `${callerNodes.length} sites · ${externalRepoCount} external repo${externalRepoCount === 1 ? '' : 's'}`
                : `${callerNodes.length} sites`}
          </span>
        </div>
        {usages.error && <div className="faint" style={{ fontSize: 11 }}>error: {usages.error}</div>}
        {!usages.loading && callerNodes.length === 0 && (
          <div className="faint" style={{ fontSize: 11 }}>no incoming references</div>
        )}
        {callersByRepo.map(([repo, nodes]) => {
          const external = repo !== '(this repo)' && repo !== ownRepo
          return (
            <div key={repo} style={{ marginTop: 8 }}>
              <div
                className="hstack"
                style={{
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: external ? 'var(--warn)' : 'var(--fg-2)',
                  marginBottom: 4,
                }}
              >
                <span className="mono">
                  {external ? '↗ ' : ''}
                  {repo}
                </span>
                <span className="mono faint">{nodes.length}</span>
              </div>
              {nodes.slice(0, 6).map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className="ref"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() =>
                    setSym({
                      id: n.id,
                      kind: (n.kind as 'function') ?? 'function',
                      name: n.name,
                      repo: n.repo_prefix ?? '',
                      file: `${n.file_path}:${n.start_line ?? 0}`,
                      sig: '',
                      callers: 0,
                      callees: 0,
                      community: '',
                      caveats: [],
                    })
                  }
                >
                  <span className={`swatch sw-${n.kind ?? 'function'}`} />
                  <span className="where">{n.name}</span>
                  <span className="count">{n.file_path?.split('/').slice(-2).join('/') ?? ''}</span>
                </button>
              ))}
              {nodes.length > 6 && (
                <div className="faint mono" style={{ fontSize: 11, padding: '2px 6px' }}>
                  +{nodes.length - 6} more
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sym-section">
        <div className="sec-ti">
          <span>Calls</span>
          <span className="mono faint" style={{ fontSize: 11 }}>
            {deps.loading ? '…' : `${calleeNodes.length} symbols`}
          </span>
        </div>
        {deps.error && <div className="faint" style={{ fontSize: 11 }}>error: {deps.error}</div>}
        {!deps.loading && calleeNodes.length === 0 && (
          <div className="faint" style={{ fontSize: 11 }}>no outgoing dependencies</div>
        )}
        {calleeNodes.slice(0, 8).map((n) => (
          <button
            type="button"
            key={n.id}
            className="ref"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() =>
              setSym({
                id: n.id,
                kind: (n.kind as 'function') ?? 'function',
                name: n.name,
                repo: n.repo_prefix ?? '',
                file: `${n.file_path}:${n.start_line ?? 0}`,
                sig: '',
                callers: 0,
                callees: 0,
                community: '',
                caveats: [],
              })
            }
          >
            <span className={`swatch sw-${n.kind ?? 'method'}`} />
            <span className="where">{n.name}</span>
            <span className="count">{n.repo_prefix ?? ''}</span>
          </button>
        ))}
      </div>

      {sym.community && (
        <div className="sym-section">
          <div className="sec-ti">Community</div>
          <div style={{ fontSize: 12.5 }}>
            <div className="mono" style={{ color: 'var(--fg-0)' }}>{sym.community}</div>
          </div>
        </div>
      )}
    </div>
  )
}
