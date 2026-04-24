'use client'

import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { CodeBlock } from '@/components/primitives/CodeBlock'
import { FlowSteps } from '@/components/primitives/FlowSteps'
import {
  useProcesses, useRepos, useProcessDetail, useSymbolSource, useSymbol,
} from '@/lib/hooks'
import { parseStepId } from '@/lib/flow'
import { useInspector } from '@/lib/inspector'
import { scopeOf, type CodeScope } from '@/lib/utils'

// Hard cap on rendered steps; sqlite flows have 800+ steps and
// scrolling a single list past a few hundred rows is useless.
const STEP_LIMIT = 200

export function ProcessesView() {
  const { data: processes, loading, error, refetch } = useProcesses()
  const { data: repos } = useRepos()
  const [sel, setSel] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  // Scope filter by entry-point path. Default "yours" because the raw
  // list is dominated by sqlite flows (Pods/) and *_test.dart main()s
  // that the user likely doesn't want to debug.
  const [scope, setScope] = useState<CodeScope>('yours')

  const counts = useMemo(() => {
    const c = { yours: 0, tests: 0, deps: 0 }
    for (const p of processes ?? []) c[scopeOf(p.entry)]++
    return c
  }, [processes])
  const scopedProcesses = useMemo(() => {
    const list = processes ?? []
    if (scope === 'all') return list
    return list.filter((p) => scopeOf(p.entry) === scope)
  }, [processes, scope])

  useEffect(() => {
    if (!scopedProcesses || scopedProcesses.length === 0) {
      setSel(null)
      return
    }
    if (!sel || !scopedProcesses.some((p) => p.id === sel)) {
      setSel(scopedProcesses[0].id)
    }
  }, [scopedProcesses, sel])
  useEffect(() => { setStepIdx(0) }, [sel])

  const { data: detail, loading: detailLoading } = useProcessDetail(sel)
  const steps = useMemo(() => (detail?.steps ?? []).slice(0, STEP_LIMIT), [detail])
  const selectedStepId = steps[stepIdx]?.id ?? null
  const selectedInfo = selectedStepId ? parseStepId(selectedStepId) : null
  // Externs (stdlib::, dep::, external::, unresolved::) have no on-disk
  // source and no graph node — skip the round-trip.
  const fetchableId = selectedInfo && selectedInfo.kind === 'firstParty' ? selectedStepId : null
  const { data: source, loading: sourceLoading } = useSymbolSource(fetchableId)
  const { data: node } = useSymbol(fetchableId)

  // Mirror the selected step into the global Inspector right-pane so
  // clicking a flow step lights up callers/callees alongside the
  // source view. Runs on every selection change — immediately with
  // the parsed ID, then enriches once useSymbol resolves.
  const setInspector = useInspector((s) => s.setSym)
  useEffect(() => {
    if (!selectedStepId) return
    const parsed = parseStepId(selectedStepId)
    setInspector({
      id: selectedStepId,
      kind: (node?.kind as string) ?? 'function',
      name: node?.name || parsed.symbol,
      repo: node?.repo_prefix || parsed.repo,
      file: node?.file_path
        ? `${node.file_path}${node.start_line ? `:${node.start_line}` : ''}`
        : parsed.path,
      sig: (node?.meta?.signature as string) ?? '',
      callers: 0,
      callees: 0,
      community: '',
      caveats: [],
    })
  }, [selectedStepId, node, setInspector])

  const repoColor = (id: string) => repos?.find((r) => r.id === id)?.color || 'var(--fg-2)'
  const proc = processes?.find((p) => p.id === sel) ?? processes?.[0]

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Processes</h1>
          <div className="sub">
            {loading
              ? 'Discovering execution flows…'
              : `${scopedProcesses.length} of ${processes?.length ?? 0} flows · ${
                  new Set(scopedProcesses.flatMap((p) => p.crosses)).size
                } repos`}
          </div>
        </div>
        <div className="actions">
          <div className="seg" style={{ height: 28 }}>
            {(['yours', 'tests', 'deps', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={scope === s ? 'active' : ''}
                onClick={() => setScope(s)}
                style={{ textTransform: 'capitalize', fontSize: 11 }}
              >
                {s}{' '}
                <span className="mono faint" style={{ marginLeft: 4 }}>
                  {s === 'all' ? processes?.length ?? 0 : counts[s]}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={refetch}>
            <Icon name="history" size={12} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 22, color: 'var(--danger)', fontSize: 13 }}>
          Failed to load processes: {error}
        </div>
      )}

      {!error && (!processes || processes.length === 0) && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No processes discovered yet. Process detection runs after indexing — try re-indexing the repository.
        </div>
      )}

      {processes && processes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', flex: 1, minHeight: 0 }}>
          {/* Column 1 — process list */}
          <div style={{ overflow: 'auto', borderRight: '1px solid var(--line-1)' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th />
                  <th>Flow</th>
                  <th>Repos</th>
                  <th className="num">Steps</th>
                  <th className="num">Score</th>
                </tr>
              </thead>
              <tbody>
                {scopedProcesses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="faint" style={{ padding: 22, textAlign: 'center', fontSize: 12 }}>
                      No processes in this scope. Try “all”.
                    </td>
                  </tr>
                )}
                {scopedProcesses.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSel(p.id)}
                    className={sel === p.id ? 'active' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ width: 26, textAlign: 'center' }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 50,
                          display: 'inline-block',
                          background:
                            p.risk === 'risk' ? 'var(--danger)' : p.risk === 'warn' ? 'var(--warn)' : 'var(--ok)',
                        }}
                      />
                    </td>
                    <td>
                      <div className="mono" style={{ color: 'var(--fg-0)' }}>{p.name}</div>
                      <div className="mono faint nowrap" style={{ fontSize: 10.5 }}>{p.entry}</div>
                    </td>
                    <td>
                      <div className="hstack" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {p.crosses.map((r, i) => (
                          <span key={i} style={{ display: 'contents' }}>
                            {i > 0 && <span className="faint mono">→</span>}
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
          </div>

          {/* Column 2 — step list for selected process */}
          <div style={{ overflow: 'auto', borderRight: '1px solid var(--line-1)', background: 'var(--bg-1)' }}>
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--line-1)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-1)',
                zIndex: 1,
              }}
            >
              <div className="mono faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Flow
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, color: 'var(--fg-0)' }}>
                {proc?.name ?? '—'}
              </div>
              <div className="mono faint" style={{ fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>
                {proc?.entry ?? ''}
              </div>
              <div className="hstack" style={{ gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {(proc?.crosses ?? []).map((r) => (
                  <span key={r} className="chip">
                    <span className="swatch" style={{ background: repoColor(r) }} />
                    {r}
                  </span>
                ))}
              </div>
              <div
                className="hstack"
                style={{ gap: 10, marginTop: 10, fontSize: 11, color: 'var(--fg-2)' }}
              >
                <span className="mono">{proc?.steps ?? 0} steps</span>
                <span className="mono">{proc?.files ?? 0} files</span>
                <span className="mono">score {proc?.score ?? 0}</span>
              </div>
            </div>
            <div style={{ padding: '8px 10px' }}>
              {detailLoading ? (
                <div className="faint" style={{ fontSize: 12, padding: 12 }}>Loading steps…</div>
              ) : (
                <FlowSteps
                  steps={steps}
                  selectedIdx={stepIdx}
                  onSelect={setStepIdx}
                  repoColor={repoColor}
                  totalSteps={detail?.steps.length}
                  limitNote={STEP_LIMIT}
                />
              )}
            </div>
          </div>

          {/* Column 3 — source + node details */}
          <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--line-1)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-0)',
                zIndex: 1,
              }}
            >
              <div className="mono faint" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Step {stepIdx + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, color: 'var(--fg-0)' }}>
                {node?.name || (selectedStepId ? parseStepId(selectedStepId).symbol : '—')}
              </div>
              <div className="mono faint" style={{ fontSize: 11, marginTop: 2, wordBreak: 'break-all' }}>
                {selectedStepId ?? ''}
              </div>
              <div className="hstack" style={{ gap: 10, marginTop: 8, fontSize: 11, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
                {node?.kind && <span className="tag-dim">{node.kind}</span>}
                {node?.file_path && (
                  <span className="mono faint" style={{ wordBreak: 'break-all' }}>
                    {node.file_path}{node.start_line ? `:${node.start_line}` : ''}
                  </span>
                )}
              </div>
              {node?.meta?.signature ? (
                <pre
                  className="code"
                  style={{ margin: '8px 0 0', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {String(node.meta.signature)}
                </pre>
              ) : null}
            </div>
            <div style={{ flex: 1, padding: 14 }}>
              {!selectedStepId && (
                <div className="faint" style={{ fontSize: 12 }}>Select a step to view its source.</div>
              )}
              {selectedStepId && (() => {
                const info = parseStepId(selectedStepId)
                if (info.kind === 'stdlib' || info.kind === 'dep' || info.kind === 'external') {
                  return (
                    <div className="faint" style={{ fontSize: 12, lineHeight: 1.6 }}>
                      <div>
                        This call lands in{' '}
                        <span className="mono" style={{ color: 'var(--fg-1)' }}>
                          {info.kind}{info.path ? ` · ${info.path}` : ''}
                        </span>
                        .
                      </div>
                      <div style={{ marginTop: 6 }}>
                        Gortex doesn&apos;t index package-manager trees by default, so there is
                        no on-disk source to show. See the roadmap item A21 (semantic
                        stdlib/dep enrichment) for authoritative resolution.
                      </div>
                    </div>
                  )
                }
                if (info.kind === 'builtin') {
                  return (
                    <div className="faint" style={{ fontSize: 12, lineHeight: 1.6 }}>
                      <div>
                        Language built-in —{' '}
                        <span className="mono" style={{ color: 'var(--fg-1)' }}>
                          {info.path}.{info.symbol}
                        </span>
                        . No user source to view.
                      </div>
                      <div style={{ marginTop: 6 }}>
                        The resolver recognised this method as part of the runtime
                        (`Array`, `String`, `list`, DOM, …). Classification comes from
                        <span className="mono"> internal/resolver/builtins.go</span>; extend
                        the map if you see a common method labelled &quot;unresolved&quot;.
                      </div>
                    </div>
                  )
                }
                if (info.kind === 'unresolved') {
                  return (
                    <div className="faint" style={{ fontSize: 12 }}>
                      Unresolved call — the parser couldn&apos;t attribute this symbol to an
                      import. Often a dynamically-bound method, a macro-expanded name,
                      or a built-in the classifier doesn&apos;t yet know about.
                    </div>
                  )
                }
                if (sourceLoading) {
                  return <div className="faint" style={{ fontSize: 12 }}>Loading source…</div>
                }
                if (!source) {
                  return (
                    <div className="faint" style={{ fontSize: 12 }}>
                      Source not available for this node.
                    </div>
                  )
                }
                return (
                  <CodeBlock
                    code={source}
                    filePath={node?.file_path ?? info.path}
                    maxHeight="100%"
                  />
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
