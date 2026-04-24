'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { CaveatBadge } from '@/components/primitives/Caveat'
import { CodeBlock } from '@/components/primitives/CodeBlock'
import { useContracts, useSymbolSource, useSymbol, useContractValidation } from '@/lib/hooks'
import type {
  Contract,
  ContractIssue,
  ContractLocation,
  ContractScope,
  ContractType,
  TypeShape,
} from '@/lib/schema'

type ScopeFilter = ContractScope | 'all'
type TypeFilter = ContractType | 'all'

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'http', label: 'HTTP' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'topic', label: 'Topic' },
  { value: 'ws', label: 'WS' },
  { value: 'env', label: 'Env' },
  { value: 'openapi', label: 'OpenAPI' },
  { value: 'dependency', label: 'Dep' },
]

const SCOPE_FILTERS: { value: ScopeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'own', label: 'Own' },
  { value: 'external', label: 'External' },
]

export function ContractsView() {
  const { data, loading, error, refetch } = useContracts()
  const contracts = data ?? []
  const { data: validation, refetch: refetchValidation } = useContractValidation()

  const [scope, setScope] = useState<ScopeFilter>('all')
  const [typ, setTyp] = useState<TypeFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const typeCounts = useMemo(() => countBy(contracts, (c) => c.type), [contracts])
  const scopeCounts = useMemo(() => countBy(contracts, (c) => c.scope), [contracts])

  // Bucket validation issues by contract ID so every row can look up
  // its own diffs in O(1). Also compute severity-summary for the row
  // so the badge renders without re-scanning the full list.
  const issuesByContract = useMemo(() => {
    const m = new Map<string, ContractIssue[]>()
    for (const is of validation?.issues ?? []) {
      const bucket = m.get(is.contract_id) ?? []
      bucket.push(is)
      m.set(is.contract_id, bucket)
    }
    return m
  }, [validation])

  const filtered = useMemo(
    () =>
      contracts.filter(
        (c) => (scope === 'all' || c.scope === scope) && (typ === 'all' || c.type === typ),
      ),
    [contracts, scope, typ],
  )
  // Breaking count is derived from validation (the contract-level
  // `breaking` flag is still unused / false pending future work).
  const breakingTotal = validation?.summary.breaking ?? 0
  const warningTotal = validation?.summary.warning ?? 0

  const refresh = () => {
    refetch()
    refetchValidation()
  }

  return (
    <>
      <div className="page-hd">
        <div>
          <h1>Contracts</h1>
          <div className="sub">
            {loading
              ? 'Loading detected contracts…'
              : validation
              ? `${filtered.length} of ${contracts.length} API/event boundaries · ${breakingTotal} breaking · ${warningTotal} warning`
              : `${filtered.length} of ${contracts.length} API/event boundaries`}
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={refresh}>
            <Icon name="history" size={12} /> Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 22px 0',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div className="hstack" style={{ gap: 0, border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' }}>
          {SCOPE_FILTERS.map((s) => {
            const active = scope === s.value
            const count = s.value === 'all' ? contracts.length : scopeCounts.get(s.value) ?? 0
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  border: 'none',
                  borderRight: '1px solid var(--line)',
                  background: active ? 'var(--bg-1)' : 'transparent',
                  color: active ? 'var(--fg-0)' : 'var(--fg-2)',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {s.label}
                <span className="faint" style={{ marginLeft: 6 }}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map((t) => {
            const count = t.value === 'all' ? contracts.length : typeCounts.get(t.value) ?? 0
            if (t.value !== 'all' && count === 0) return null
            const active = typ === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTyp(t.value)}
                className="chip"
                style={{
                  cursor: 'pointer',
                  background: active ? 'var(--bg-1)' : 'transparent',
                  color: active ? 'var(--fg-0)' : 'var(--fg-2)',
                  borderColor: active ? 'var(--fg-2)' : 'var(--line)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {t.label} <span className="faint" style={{ marginLeft: 4 }}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{ padding: 22, color: 'var(--danger)', fontSize: 13 }}>
          Failed to load contracts: {error}
        </div>
      )}

      {!error && contracts.length === 0 && !loading && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No contracts detected. Make sure the indexer ran on a repository that exposes HTTP, gRPC, or event topics.
        </div>
      )}

      {!error && contracts.length > 0 && filtered.length === 0 && (
        <div style={{ padding: 22, color: 'var(--fg-2)', fontSize: 13 }}>
          No contracts match the current filters.
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ padding: '18px 22px', overflow: 'auto' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map((c) => (
              <ContractRow
                key={c.id}
                c={c}
                issues={issuesByContract.get(c.id) ?? []}
                expanded={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ContractRow({
  c,
  issues,
  expanded,
  onToggle,
}: {
  c: Contract
  issues: ContractIssue[]
  expanded: boolean
  onToggle: () => void
}) {
  const badge = kindBadge(c.kind)
  const [selected, setSelected] = useState<ContractLocation | null>(null)
  const [mode, setMode] = useState<'source' | 'schema' | 'issues'>('source')
  const providerLoc = c.locations.find((l) => l.role === 'provider') ?? null

  const breakingCount = issues.filter((i) => i.severity === 'breaking').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  const openTrace = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!expanded) onToggle()
    setMode('source')
    setSelected(providerLoc ?? c.locations[0] ?? null)
  }
  const openSchema = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!expanded) onToggle()
    setMode('schema')
    if (!selected) setSelected(providerLoc ?? c.locations[0] ?? null)
  }

  return (
    <div className="card">
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr auto',
          gap: 14,
          padding: 14,
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: badge.bg,
            color: badge.fg,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {badge.label}
        </div>
        <div>
          <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Icon name={expanded ? 'caretdn' : 'caret'} size={10} />
            <span className="mono" style={{ fontSize: 14, color: 'var(--fg-0)' }}>{c.name}</span>
            <span className="chip" title={`type: ${c.type}`}>{c.type}</span>
            <span
              className="chip"
              title={c.scope === 'own' ? 'Defined in this project' : 'External or consumed-only'}
              style={{
                color: c.scope === 'own' ? 'var(--fg-0)' : 'var(--fg-2)',
                borderColor: c.scope === 'own' ? 'var(--fg-2)' : 'var(--line)',
              }}
            >
              {c.scope}
            </span>
            {c.breaking && <CaveatBadge kind="boundary" />}
            {c.version && <span className="chip">{c.version}</span>}
            {breakingCount > 0 && (
              <span
                className="chip"
                title={`${breakingCount} breaking change${breakingCount === 1 ? '' : 's'} — click to inspect`}
                style={{
                  color: 'var(--danger)',
                  borderColor: 'var(--danger)',
                  background: 'oklch(0.6 0.22 25 / 0.1)',
                  fontWeight: 600,
                }}
              >
                ⚠ {breakingCount} breaking
              </span>
            )}
            {warningCount > 0 && (
              <span
                className="chip"
                title={`${warningCount} warning${warningCount === 1 ? '' : 's'}`}
                style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}
              >
                {warningCount} warning
              </span>
            )}
          </div>
          <div className="hstack" style={{ gap: 10, marginTop: 6, fontSize: 11.5, color: 'var(--fg-2)', flexWrap: 'wrap' }}>
            <span>
              Produced by <span className="tag-dim">{c.producer || 'unknown'}</span>
            </span>
            {c.consumers.length > 0 && (
              <>
                <span>→</span>
                <span className="hstack" style={{ gap: 4 }}>
                  consumed by{' '}
                  {c.consumers.map((r) => (
                    <span key={r} className="tag-dim">{r}</span>
                  ))}
                </span>
              </>
            )}
            <span className="faint">· {c.locations.length} location{c.locations.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="hstack" style={{ gap: 6 }}>
          <button type="button" className="btn small ghost" onClick={openTrace}>
            <Icon name="graph" size={11} /> Trace
          </button>
          <button type="button" className="btn small" onClick={openSchema}>
            <Icon name="file" size={11} /> Schema
          </button>
        </div>
      </div>

      {expanded && (
        <ContractDetail
          c={c}
          issues={issues}
          selected={selected}
          onSelect={setSelected}
          mode={mode}
          setMode={setMode}
        />
      )}
    </div>
  )
}

function ContractDetail({
  c,
  issues,
  selected,
  onSelect,
  mode,
  setMode,
}: {
  c: Contract
  issues: ContractIssue[]
  selected: ContractLocation | null
  onSelect: (l: ContractLocation) => void
  mode: 'source' | 'schema' | 'issues'
  setMode: (m: 'source' | 'schema' | 'issues') => void
}) {
  const providers = c.locations.filter((l) => l.role === 'provider')
  const consumers = c.locations.filter((l) => l.role === 'consumer')

  return (
    <div
      style={{
        borderTop: '1px solid var(--line)',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 320px) 1fr',
        minHeight: 220,
      }}
    >
      <div
        style={{
          borderRight: '1px solid var(--line)',
          padding: '10px 12px',
          maxHeight: 480,
          overflow: 'auto',
          fontSize: 12,
        }}
      >
        {providers.length > 0 && (
          <LocationGroup
            label="Providers"
            locations={providers}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        {consumers.length > 0 && (
          <LocationGroup
            label="Consumers"
            locations={consumers}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        {c.locations.length === 0 && (
          <div className="faint" style={{ padding: 8 }}>No locations recorded.</div>
        )}
      </div>

      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0 }}>
        <div className="hstack" style={{ gap: 6, marginBottom: 8 }}>
          <button
            type="button"
            className="chip"
            onClick={() => setMode('source')}
            style={{
              cursor: 'pointer',
              background: mode === 'source' ? 'var(--bg-1)' : 'transparent',
              color: mode === 'source' ? 'var(--fg-0)' : 'var(--fg-2)',
              borderColor: mode === 'source' ? 'var(--fg-2)' : 'var(--line)',
              fontWeight: mode === 'source' ? 600 : 400,
            }}
          >
            Source
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setMode('schema')}
            style={{
              cursor: 'pointer',
              background: mode === 'schema' ? 'var(--bg-1)' : 'transparent',
              color: mode === 'schema' ? 'var(--fg-0)' : 'var(--fg-2)',
              borderColor: mode === 'schema' ? 'var(--fg-2)' : 'var(--line)',
              fontWeight: mode === 'schema' ? 600 : 400,
            }}
          >
            Schema / Meta
          </button>
          {issues.length > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => setMode('issues')}
              style={{
                cursor: 'pointer',
                background: mode === 'issues' ? 'var(--bg-1)' : 'transparent',
                color:
                  mode === 'issues'
                    ? 'var(--fg-0)'
                    : issues.some((i) => i.severity === 'breaking')
                    ? 'var(--danger)'
                    : 'var(--fg-2)',
                borderColor:
                  mode === 'issues'
                    ? 'var(--fg-2)'
                    : issues.some((i) => i.severity === 'breaking')
                    ? 'var(--danger)'
                    : 'var(--line)',
                fontWeight: mode === 'issues' ? 600 : 400,
              }}
            >
              Issues · {issues.length}
            </button>
          )}
          {selected && (
            <span className="faint mono" style={{ marginLeft: 'auto', fontSize: 11 }}>
              {selected.file_path}:{selected.line}
            </span>
          )}
        </div>

        {mode === 'source' ? (
          <SourcePane symbolId={selected?.symbol_id ?? null} filePath={selected?.file_path ?? null} />
        ) : mode === 'schema' ? (
          <SchemaPane contract={c} loc={selected} />
        ) : (
          <IssuesPane issues={issues} />
        )}
      </div>
    </div>
  )
}

function IssuesPane({ issues }: { issues: ContractIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="faint" style={{ padding: 12, fontSize: 12 }}>
        No validation issues detected for this contract. Provider and
        consumer shapes match.
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 6, overflow: 'auto' }}>
      {issues.map((is, i) => (
        <IssueRow key={`${is.kind}-${is.field}-${i}`} issue={is} />
      ))}
    </div>
  )
}

function IssueRow({ issue }: { issue: ContractIssue }) {
  const sevColor =
    issue.severity === 'breaking'
      ? 'var(--danger)'
      : issue.severity === 'warning'
      ? 'var(--warn)'
      : 'var(--fg-2)'
  const sevBg =
    issue.severity === 'breaking'
      ? 'oklch(0.6 0.22 25 / 0.08)'
      : issue.severity === 'warning'
      ? 'oklch(0.82 0.15 80 / 0.08)'
      : 'transparent'
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${sevColor}`,
        background: sevBg,
        borderRadius: 4,
        padding: '8px 10px',
        fontSize: 12,
        display: 'grid',
        gap: 4,
      }}
    >
      <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span
          className="chip"
          style={{
            color: sevColor,
            borderColor: sevColor,
            fontWeight: 600,
            fontSize: 10,
            textTransform: 'uppercase',
          }}
        >
          {issue.severity}
        </span>
        <span className="mono" style={{ fontSize: 11.5 }}>{issue.kind}</span>
        {issue.field && (
          <span className="mono faint" style={{ fontSize: 11 }}>field={issue.field}</span>
        )}
      </div>
      {issue.details && (
        <div className="faint" style={{ fontSize: 11.5, lineHeight: 1.45 }}>{issue.details}</div>
      )}
      <div className="hstack" style={{ gap: 6, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--fg-2)' }}>
        {issue.provider && <span>provider={issue.provider}</span>}
        {issue.consumer && <span>consumer={issue.consumer}</span>}
        {issue.provider_type && (
          <span className="mono" title="Provider type">p={issue.provider_type}</span>
        )}
        {issue.consumer_type && (
          <span className="mono" title="Consumer type">c={issue.consumer_type}</span>
        )}
      </div>
    </div>
  )
}

function LocationGroup({
  label,
  locations,
  selected,
  onSelect,
}: {
  label: string
  locations: ContractLocation[]
  selected: ContractLocation | null
  onSelect: (l: ContractLocation) => void
}) {
  const byRepo = new Map<string, ContractLocation[]>()
  for (const l of locations) {
    const key = l.repo_prefix || '(unknown)'
    const bucket = byRepo.get(key) ?? []
    bucket.push(l)
    byRepo.set(key, bucket)
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="faint" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, marginBottom: 6 }}>
        {label} · {locations.length}
      </div>
      {[...byRepo.entries()].map(([repo, items]) => (
        <div key={repo} style={{ marginBottom: 8 }}>
          <div className="tag-dim" style={{ marginBottom: 4 }}>{repo}</div>
          <div style={{ display: 'grid', gap: 2 }}>
            {items.map((l, i) => {
              const isSel = selected === l
              return (
                <button
                  key={`${l.file_path}:${l.line}:${i}`}
                  type="button"
                  onClick={() => onSelect(l)}
                  className="mono"
                  title={l.symbol_id}
                  style={{
                    textAlign: 'left',
                    background: isSel ? 'var(--bg-1)' : 'transparent',
                    color: isSel ? 'var(--fg-0)' : 'var(--fg-2)',
                    border: '1px solid',
                    borderColor: isSel ? 'var(--fg-2)' : 'transparent',
                    borderRadius: 4,
                    padding: '3px 6px',
                    fontSize: 11,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {l.file_path}:{l.line}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SourcePane({ symbolId, filePath }: { symbolId: string | null; filePath: string | null }) {
  const { data, loading, error } = useSymbolSource(symbolId)
  if (!symbolId) {
    return (
      <div className="faint" style={{ padding: 12, fontSize: 12 }}>
        Select a location on the left to view its source.
      </div>
    )
  }
  if (loading) return <div className="faint" style={{ padding: 12 }}>Loading source…</div>
  if (error) return <div style={{ padding: 12, color: 'var(--danger)', fontSize: 12 }}>Failed to load source: {error}</div>
  if (!data) return <div className="faint" style={{ padding: 12, fontSize: 12 }}>No source available for {symbolId}.</div>
  return <CodeBlock code={data} filePath={filePath ?? undefined} maxHeight={420} />
}

function SchemaPane({ contract, loc }: { contract: Contract; loc: ContractLocation | null }) {
  // Render one panel per location instead of merging consumers into
  // a single column. With multiple consumers (e.g. tuck_app + web)
  // the merged view hid which side actually declared what — you
  // couldn't tell whether "not declared on this side" meant neither
  // consumer captured a request or one did and the merger dropped
  // it. Per-location panels make every side's data visible and
  // pin each to its repo so diffs are attributable.
  const panels = contract.locations
    .map((l) => buildSchemaFromLocation(l))
    .filter((p): p is LocationPanel => p !== null)

  const hasAny = panels.length > 0

  return (
    <div style={{ display: 'grid', gap: 10, overflow: 'auto' }}>
      {hasAny ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}
        >
          {panels.map((p, i) => (
            <SchemaSide
              key={`${p.role}-${p.repo}-${i}`}
              label={p.role === 'provider' ? 'Provider' : 'Consumer'}
              subLabel={p.subLabel}
              schema={p.schema}
              contractType={contract.type}
              accent={p.role === 'provider' ? 'var(--ok)' : 'var(--violet)'}
            />
          ))}
        </div>
      ) : (
        <div className="faint" style={{ padding: 12, fontSize: 12 }}>
          No schema shape was extracted for this contract. The extractor
          either didn&apos;t recognise the framework binding, or the
          handler writes an inline / anonymous type. Raw per-location
          meta is shown below.
        </div>
      )}

      {loc?.meta && Object.keys(loc.meta).length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Location meta {loc.symbol_id ? `· ${loc.symbol_id}` : ''}
          </div>
          <CodeBlock code={JSON.stringify(loc.meta, null, 2)} lang="json" maxHeight={240} />
        </div>
      )}
    </div>
  )
}

// LocationPanel is one column in the side-by-side comparison — a
// single contract location's meta projected into the ContractSchema
// shape for rendering. We attribute every panel to its specific repo
// + symbol so multi-consumer contracts show each consumer's view
// independently instead of hiding differences behind a merged blob.
type LocationPanel = {
  role: 'provider' | 'consumer' | string
  repo: string
  subLabel: string
  schema: import('@/lib/schema').ContractSchema
}

function buildSchemaFromLocation(l: ContractLocation): LocationPanel | null {
  const meta = l.meta ?? {}
  if (Object.keys(meta).length === 0) return null

  const asString = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : undefined)
  const asStringArr = (k: string): string[] | undefined => {
    const v = meta[k]
    return Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : undefined
  }
  const asNumberArr = (k: string): number[] | undefined => {
    const v = meta[k]
    return Array.isArray(v) && v.every((x) => typeof x === 'number') ? (v as number[]) : undefined
  }
  const asBool = (k: string) => (typeof meta[k] === 'boolean' ? (meta[k] as boolean) : undefined)

  const schema: import('@/lib/schema').ContractSchema = {
    request_type: asString('request_type'),
    response_type: asString('response_type'),
    request_expr: asString('request_expr'),
    response_expr: asString('response_expr'),
    request_stream: asBool('request_stream'),
    response_stream: asBool('response_stream'),
    path_params: asStringArr('path_params'),
    query_params: asStringArr('query_params'),
    status_codes: asNumberArr('status_codes'),
    source: asString('schema_source'),
  }

  const subLabel = l.symbol_id
    ? `${l.repo_prefix || 'unknown'} · ${l.symbol_id.split('::').pop()}`
    : l.repo_prefix || 'unknown'

  return { role: l.role, repo: l.repo_prefix, subLabel, schema }
}

// SchemaSide is one column in the provider/consumer comparison view.
// Renders a small header (role label + repo + schema-source badge)
// then the request / response bodies and param lists. Same content
// structure used on both sides so visual diffing is straightforward.
function SchemaSide({
  label,
  subLabel,
  schema,
  contractType,
  accent,
}: {
  label: string
  subLabel: string
  schema: import('@/lib/schema').ContractSchema
  contractType: string
  accent: string
}) {
  const hasParams =
    (schema.path_params?.length ?? 0) > 0 ||
    (schema.query_params?.length ?? 0) > 0 ||
    (schema.status_codes?.length ?? 0) > 0

  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        padding: '10px 12px',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 4,
        background: 'var(--bg-0)',
        minWidth: 0,
      }}
    >
      <div className="hstack" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: accent,
          }}
        >
          {label}
        </span>
        {subLabel && (
          <span className="mono faint" style={{ fontSize: 11 }}>
            {subLabel}
          </span>
        )}
        {schema.source && (
          <span
            className="chip"
            title="How the schema was inferred"
            style={{
              marginLeft: 'auto',
              color:
                schema.source === 'extracted'
                  ? 'var(--ok)'
                  : schema.source === 'partial'
                  ? 'var(--warn)'
                  : 'var(--fg-2)',
              fontSize: 10,
            }}
          >
            {schema.source}
          </span>
        )}
      </div>

      {/* Always render BOTH Request and Response rows so a provider / consumer
          comparison can scan line-for-line. Missing halves render as an
          explicit "not declared" placeholder instead of collapsing the row,
          otherwise one side would hide the row entirely and misalign the
          visual comparison. */}
      <ContractBody
        label="Request"
        type={schema.request_type}
        expr={schema.request_expr}
        stream={schema.request_stream}
        contractType={contractType}
        placeholder="not declared on this side"
      />
      <ContractBody
        label="Response"
        type={schema.response_type}
        expr={schema.response_expr}
        stream={schema.response_stream}
        contractType={contractType}
        placeholder="not declared on this side"
      />

      {hasParams && (
        <div style={{ display: 'grid', gap: 4 }}>
          {(schema.path_params?.length ?? 0) > 0 && (
            <ParamRow label="Path params" values={schema.path_params!} />
          )}
          {(schema.query_params?.length ?? 0) > 0 && (
            <ParamRow label="Query params" values={schema.query_params!} />
          )}
          {(schema.status_codes?.length ?? 0) > 0 && (
            <ParamRow label="Status codes" values={schema.status_codes!.map(String)} />
          )}
        </div>
      )}
    </div>
  )
}

// ContractBody renders a request or response payload transparently —
// if the graph has a shape attached to the referenced type, we
// render it as a JSON object (or proto message, if the contract
// type is gRPC) so the reader sees the actual wire structure, not
// just a symbol ID chip. Falls back to a raw type chip or a bare
// expression when the shape can't be resolved.
function ContractBody({
  label,
  type,
  expr,
  stream,
  contractType,
  placeholder,
}: {
  label: string
  type?: string
  expr?: string
  stream?: boolean
  contractType: string
  /**
   * Text shown when this side has no declared body for this role.
   * Rendered as a dim placeholder so the row still appears and
   * provider/consumer panels stay aligned for visual comparison.
   * When omitted, a null return preserves the older collapse-row
   * behaviour for callers that want it.
   */
  placeholder?: string
}) {
  const symbolId = type && type.includes('::') ? type : null
  const { data: node } = useSymbol(symbolId)
  const shape = (node?.meta?.shape ?? null) as TypeShape | null

  const typeDisplay = type ? lastSegment(type) : ''
  const kindHint = contractType === 'grpc' ? 'message' : 'object'
  const isEmpty = !type && !expr
  if (isEmpty && !placeholder) return null

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div className="hstack" style={{ gap: 8, alignItems: 'baseline', fontSize: 11 }}>
        <span
          className="faint"
          style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}
        >
          {label}
          {stream && <span style={{ marginLeft: 4, color: 'var(--violet)' }}>stream</span>}
        </span>
        {type && (
          <span
            className="mono"
            title={symbolId ? 'Symbol ID (resolved)' : 'Bare type name (unresolved across repos)'}
            style={{
              color: symbolId ? 'var(--fg-1)' : 'var(--fg-2)',
              fontSize: 11.5,
            }}
          >
            {typeDisplay}
          </span>
        )}
        {!type && expr && (
          <span className="mono faint" style={{ fontSize: 11 }}>{expr}</span>
        )}
        {isEmpty && (
          <span
            className="faint"
            style={{ fontSize: 11, fontStyle: 'italic' }}
          >
            {placeholder}
          </span>
        )}
      </div>

      {shape && shape.fields.length > 0 ? (
        <JSONPreview shape={shape} kindHint={kindHint} />
      ) : symbolId ? (
        <div
          className="faint"
          style={{
            fontSize: 11,
            padding: '4px 0',
            marginLeft: 2,
          }}
        >
          Shape not indexed for <span className="mono">{type}</span>. Re-index the
          type&apos;s repo or extend the shape extractor for its language.
        </div>
      ) : null}
    </div>
  )
}

// JSONPreview renders a TypeShape as a JSON-object literal:
//
//   {
//     "id": string,
//     "created_at": string,
//     "provider"?: string,
//     "tags": string[]
//   }
//
// Optional fields get a trailing `?`, repeated fields get `[]`,
// JSON tag renames are displayed as an aside when they diverge.
function JSONPreview({ shape, kindHint }: { shape: TypeShape; kindHint: string }) {
  const isProto = shape.kind === 'message'
  const open = isProto ? `${kindHint} {` : '{'
  const close = '}'
  return (
    <pre
      className="mono"
      style={{
        margin: 0,
        padding: '8px 10px',
        background: 'var(--bg-1)',
        border: '1px solid var(--line)',
        borderRadius: 4,
        fontSize: 11.5,
        lineHeight: 1.55,
        overflow: 'auto',
        maxHeight: 280,
      }}
    >
      <span className="faint">{open}</span>
      {'\n'}
      {shape.fields.map((f, i) => (
        <JSONPreviewField
          key={f.name}
          f={f}
          trailingComma={i < shape.fields.length - 1}
          isProto={isProto}
        />
      ))}
      <span className="faint">{close}</span>
    </pre>
  )
}

function JSONPreviewField({
  f,
  trailingComma,
  isProto,
}: {
  f: { name: string; type: string; required: boolean; repeated?: boolean; json_tag?: string; comment?: string }
  trailingComma: boolean
  isProto: boolean
}) {
  // Proto uses `<type> <name> = N;` ordering; JSON uses `"<name>": <type>,`.
  const typeDisplay = f.repeated && !isProto ? `${f.type}[]` : f.type
  const nameDisplay = isProto ? f.name : `"${f.name}"`
  const optional = !isProto && !f.required
  const aliasNote =
    f.json_tag && f.json_tag !== f.name ? (
      <span className="faint" style={{ marginLeft: 8, fontSize: 10.5 }}>
        (json: {f.json_tag})
      </span>
    ) : null

  return (
    <div style={{ paddingLeft: 14 }}>
      {isProto && f.repeated && <span style={{ color: 'var(--violet)' }}>repeated </span>}
      {isProto && <span style={{ color: 'var(--k-type)' }}>{f.type} </span>}
      <span style={{ color: f.required ? 'var(--fg-0)' : 'var(--fg-2)' }}>{nameDisplay}</span>
      {optional && <span className="faint">?</span>}
      {!isProto && <span className="faint">:</span>}{' '}
      {!isProto && <span style={{ color: 'var(--k-type)' }}>{typeDisplay}</span>}
      {trailingComma && !isProto && <span className="faint">,</span>}
      {isProto && <span className="faint">;</span>}
      {aliasNote}
      {f.comment && (
        <span className="faint" style={{ marginLeft: 10, fontStyle: 'italic' }}>
          // {f.comment}
        </span>
      )}
    </div>
  )
}

// lastSegment trims a symbol ID down to the type name for display.
// `tuck_app/lib/shared/models/email_ingest_log_entry.dart::EmailIngestLogEntry` →
// `EmailIngestLogEntry`. Full ID is always available in the hover title.
function lastSegment(id: string): string {
  const idx = id.lastIndexOf('::')
  if (idx >= 0) return id.slice(idx + 2)
  return id
}

function ParamRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr',
        gap: 10,
        alignItems: 'baseline',
        fontSize: 12,
      }}
    >
      <div className="faint" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div className="hstack" style={{ gap: 4, flexWrap: 'wrap' }}>
        {values.map((v) => (
          <span
            key={v}
            className="mono"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--line)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

function countBy<T, K>(xs: T[], key: (x: T) => K): Map<K, number> {
  const m = new Map<K, number>()
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1)
  return m
}

function kindBadge(kind: string): { label: string; bg: string; fg: string } {
  switch (kind) {
    case 'EVENT':
      return { label: 'EV', bg: 'oklch(0.78 0.14 300 / 0.18)', fg: 'var(--violet)' }
    case 'URL':
      return { label: 'URL', bg: 'oklch(0.82 0.15 80 / 0.18)', fg: 'var(--warn)' }
    case 'ENV':
      return { label: 'ENV', bg: 'oklch(0.8 0.1 140 / 0.18)', fg: 'var(--ok)' }
    case 'DEP':
      return { label: 'DEP', bg: 'oklch(0.7 0.08 260 / 0.18)', fg: 'var(--fg-2)' }
    default:
      return { label: 'API', bg: 'oklch(0.82 0.14 45 / 0.18)', fg: 'var(--k-contract)' }
  }
}
