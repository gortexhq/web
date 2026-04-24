type Severity = 'deprecated' | 'risk' | 'hot' | 'unowned' | 'cycle' | 'boundary'

const LABELS: Record<Severity, string> = {
  deprecated: 'deprecated',
  risk: 'risk',
  hot: 'hot',
  unowned: 'unowned',
  cycle: 'cycle',
  boundary: 'boundary',
}

export function CaveatBadge({ kind }: { kind: Severity | string }) {
  return <span className={`cav ${kind}`}>{LABELS[kind as Severity] ?? kind}</span>
}

export function CaveatDot({ kind, title }: { kind: Severity | string; title?: string }) {
  const color = {
    deprecated: 'var(--warn)',
    risk: 'var(--danger)',
    hot: 'var(--pink)',
    unowned: 'var(--violet)',
    cycle: 'var(--info)',
    boundary: 'var(--k-contract)',
  }[kind as Severity] || 'var(--fg-2)'
  return (
    <span
      title={title || kind}
      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 50, background: color, marginLeft: 4 }}
    />
  )
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        border: '1px solid var(--line-1)',
        borderRadius: 3,
        padding: '0 4px',
        background: 'var(--bg-1)',
        color: 'var(--fg-2)',
        fontSize: 10.5,
      }}
    >
      {children}
    </span>
  )
}
