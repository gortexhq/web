type SparkProps = { data: number[]; w?: number; h?: number; stroke?: string; fill?: string }
export function Sparkline({ data, w = 52, h = 16, stroke = 'currentColor', fill = 'none' }: SparkProps) {
  if (!data?.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * w,
    h - ((d - min) / range) * h,
  ])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {fill !== 'none' && (
        <path d={`${d} L${w},${h} L0,${h} Z`} fill={fill} opacity="0.35" />
      )}
      <path d={d} stroke={stroke} strokeWidth="1.2" fill="none" />
    </svg>
  )
}

type RingProps = {
  segments: { value: number; color: string }[]
  size?: number
  stroke?: number
  innerLabel?: string
  innerValue?: string
}
export function KindRing({ segments, size = 220, stroke = 28, innerLabel, innerValue }: RingProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="radial" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 400ms' }}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="center">
        <div>
          <div className="num">{innerValue}</div>
          <div className="lbl">{innerLabel}</div>
        </div>
      </div>
    </div>
  )
}

type HBarProps = {
  rows: { label: string; value: number; color?: string; display?: string }[]
  labelWidth?: number
  showNums?: boolean
}
export function HBar({ rows, labelWidth = 90, showNums = true }: HBarProps) {
  const max = Math.max(...rows.map(r => r.value)) || 1
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: `${labelWidth}px 1fr 56px`,
            alignItems: 'center',
            gap: 10,
            fontSize: 11.5,
          }}
        >
          <div className="mono" style={{ color: 'var(--fg-1)' }}>{r.label}</div>
          <div style={{ height: 10, background: 'var(--bg-3)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(r.value / max) * 100}%`,
                height: '100%',
                background: r.color || 'var(--accent)',
                borderRadius: 2,
                transition: 'width 300ms',
              }}
            />
          </div>
          <div className="mono" style={{ color: 'var(--fg-2)', textAlign: 'right', fontSize: 11 }}>
            {showNums ? (r.display ?? r.value.toLocaleString()) : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StackedBar({ parts, height = 4 }: { parts: { value: number; color?: string; label?: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  return (
    <div style={{ display: 'flex', height, borderRadius: 2, overflow: 'hidden', background: 'var(--bg-3)' }}>
      {parts.map((p, i) => (
        <div
          key={i}
          title={p.label ? `${p.label}: ${p.value}` : undefined}
          style={{ width: `${(p.value / total) * 100}%`, background: p.color || 'var(--accent)' }}
        />
      ))}
    </div>
  )
}

export function Meter({ value, color = 'var(--accent)', thin = false }: { value: number; color?: string; thin?: boolean }) {
  return (
    <div className="meter" style={{ height: thin ? 3 : 4 }}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}
