import { useMemo, useState } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { crossLabel, parseStepId } from '@/lib/flow'

export type FlowStep = {
  id: string
  depth: number
}

export type FlowStepsProps = {
  // Flat DFS preorder with depth; parent of step i is the nearest
  // preceding step whose depth < steps[i].depth. See
  // internal/analysis/processes.go::Step for the producer.
  steps: FlowStep[]
  selectedIdx: number
  onSelect: (idx: number) => void
  // Returns the colour swatch for a first-party repo. Pass a stub that
  // returns a neutral fg-2 if the caller has no per-repo palette.
  repoColor: (repo: string) => string
  // When provided, renders a "Showing first N of M steps" footer so the
  // user knows the list is capped. Optional; omit to skip the footer.
  totalSteps?: number
  limitNote?: number
}

// Pixels per tree column. Each column holds one `│ ` runner or `├─/└─`
// branch glyph. Chosen so a 15-deep flow still fits in a 600px tile
// without horizontal scroll.
const COL_PX = 16

type TreeMeta = {
  parentIdx: number[]         // parent index per step, -1 for root
  isLastChild: boolean[]      // true if no later sibling under same parent
  subtreeSize: number[]       // count of descendants (not including self)
  chainDepth0To1: number[][]  // indices on path from root (depth 0) to step at each depth level
}

// Precompute the bookkeeping needed to render a tree once — parent
// pointers, last-child flags, subtree sizes, and per-step ancestor
// chains. All O(n) in total.
function buildTreeMeta(steps: FlowStep[]): TreeMeta {
  const n = steps.length
  const parentIdx = new Array<number>(n).fill(-1)
  const stack: number[] = []
  for (let i = 0; i < n; i++) {
    while (stack.length > 0 && steps[stack[stack.length - 1]].depth >= steps[i].depth) {
      stack.pop()
    }
    parentIdx[i] = stack.length > 0 ? stack[stack.length - 1] : -1
    stack.push(i)
  }

  // isLastChild: last seen entry for each parent stays true; earlier
  // ones flip to false as later siblings arrive.
  const isLastChild = new Array<boolean>(n).fill(true)
  const lastSeenByParent = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const p = parentIdx[i]
    const prev = lastSeenByParent.get(p)
    if (prev !== undefined) isLastChild[prev] = false
    lastSeenByParent.set(p, i)
  }

  // subtreeSize[i] = count of steps j > i with depth > steps[i].depth
  // (a descendant runs until depth returns to ≤ i's depth).
  const subtreeSize = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    let j = i + 1
    while (j < n && steps[j].depth > steps[i].depth) j++
    subtreeSize[i] = j - i - 1
  }

  // Ancestor chain per step — index of the node at each depth on the
  // path from root down to the step. Bounded by traceForward's maxDepth
  // (15) so this stays small.
  const chainDepth0To1 = new Array<number[]>(n)
  for (let i = 0; i < n; i++) {
    const chain = new Array<number>(steps[i].depth + 1)
    let cur = i
    for (let d = steps[i].depth; d >= 0; d--) {
      chain[d] = cur
      cur = parentIdx[cur]
    }
    chainDepth0To1[i] = chain
  }

  return { parentIdx, isLastChild, subtreeSize, chainDepth0To1 }
}

// FlowSteps renders a discovered process as an indented call tree with
// Unix-style connectors. Siblings stay siblings, and repo-hop markers
// reflect the real parent → child edge rather than the previous flat-
// list row. Clicking the disclosure toggles a subtree, so a 200-step
// branch can be folded away while a parallel 5-step branch stays open.
export function FlowSteps({
  steps,
  selectedIdx,
  onSelect,
  repoColor,
  totalSteps,
  limitNote,
}: FlowStepsProps) {
  const meta = useMemo(() => buildTreeMeta(steps), [steps])
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())

  const toggle = (i: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (steps.length === 0) {
    return (
      <div className="faint" style={{ fontSize: 12, padding: 14 }}>
        No steps available for this flow.
      </div>
    )
  }

  // Walk steps[] once, skipping any whose ancestor is collapsed. The
  // hideBelowDepth cursor tracks when we're inside a folded subtree.
  const visible: number[] = []
  let hideBelowDepth = Number.POSITIVE_INFINITY
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].depth > hideBelowDepth) continue
    hideBelowDepth = Number.POSITIVE_INFINITY
    visible.push(i)
    if (collapsed.has(i)) hideBelowDepth = steps[i].depth
  }

  return (
    <>
      {visible.map((i) => {
        const step = steps[i]
        const cur = parseStepId(step.id)
        const pIdx = meta.parentIdx[i]
        const parent = pIdx >= 0 ? parseStepId(steps[pIdx].id) : null
        const hasChildren = meta.subtreeSize[i] > 0
        const isCollapsed = hasChildren && collapsed.has(i)

        // Build the tree-column glyphs for this row. Columns 0..depth-1
        // represent the edges from root down to this step. For each
        // intermediate ancestor depth k, render `│` when that ancestor
        // has later siblings, else blank. At column depth-1 render the
        // branch glyph (├─ / └─) based on this step's own isLastChild.
        const cols: { glyph: string; runner: boolean }[] = []
        for (let d = 1; d <= step.depth; d++) {
          const ancestorIdx = meta.chainDepth0To1[i][d]
          if (d === step.depth) {
            cols.push({ glyph: meta.isLastChild[i] ? '└─' : '├─', runner: false })
          } else {
            cols.push({ glyph: meta.isLastChild[ancestorIdx] ? '  ' : '│ ', runner: true })
          }
        }

        const crosses =
          parent && parent.repo !== cur.repo ? (
            <div
              className="repo-hop"
              style={{ margin: '4px 0 2px', marginLeft: step.depth * COL_PX }}
            >
              <Icon name="arrowr" size={10} /> crosses {crossLabel(parent)} → {crossLabel(cur)}
            </div>
          ) : null
        const isSel = selectedIdx === i
        const repoBadge =
          cur.kind === 'stdlib'
            ? { label: 'stdlib', color: 'var(--violet)' }
            : cur.kind === 'dep'
            ? { label: 'dep', color: 'var(--warn)' }
            : cur.kind === 'builtin'
            ? { label: cur.path || 'builtin', color: 'var(--violet)' }
            : cur.kind === 'external'
            ? { label: 'external', color: 'var(--fg-3)' }
            : cur.kind === 'unresolved'
            ? { label: 'unresolved', color: 'var(--fg-3)' }
            : cur.repo
            ? { label: cur.repo, color: repoColor(cur.repo) }
            : null
        return (
          <div key={step.id + ':' + i}>
            {crosses}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 8px',
                borderBottom: '1px dashed var(--line-1)',
                background: isSel ? 'var(--accent-soft)' : 'transparent',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={() => onSelect(i)}
            >
              {cols.length > 0 && (
                <span
                  aria-hidden
                  className="mono faint"
                  style={{
                    flex: '0 0 auto',
                    whiteSpace: 'pre',
                    fontSize: 12,
                    lineHeight: '20px',
                    color: 'var(--fg-3)',
                  }}
                >
                  {cols.map((c) => c.glyph).join('')}
                </span>
              )}
              {/* Disclosure chevron — only nodes with children get one.
                  Stops click propagation so toggling doesn't also
                  re-select the row. */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasChildren) toggle(i)
                }}
                disabled={!hasChildren}
                aria-label={hasChildren ? (isCollapsed ? 'expand' : 'collapse') : undefined}
                style={{
                  flex: '0 0 auto',
                  width: 14,
                  height: 20,
                  padding: 0,
                  border: 0,
                  background: 'transparent',
                  color: hasChildren ? 'var(--fg-2)' : 'transparent',
                  cursor: hasChildren ? 'pointer' : 'default',
                  fontSize: 10,
                  lineHeight: '20px',
                }}
              >
                {hasChildren ? (isCollapsed ? '▸' : '▾') : '·'}
              </button>
              <span
                className="mono"
                style={{
                  flex: '0 0 auto',
                  display: 'inline-grid',
                  placeItems: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: 50,
                  background: 'var(--bg-3)',
                  color: 'var(--fg-0)',
                  fontSize: 10.5,
                  marginTop: 0,
                }}
              >
                {i + 1}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {repoBadge && (
                    <span
                      className="repo-tag"
                      style={{
                        borderLeft: `2px solid ${repoBadge.color}`,
                        paddingLeft: 4,
                      }}
                    >
                      {repoBadge.label}
                    </span>
                  )}
                  <span
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--fg-0)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {cur.symbol}
                  </span>
                  {isCollapsed && (
                    <span
                      className="mono faint"
                      style={{ fontSize: 10.5, color: 'var(--fg-3)' }}
                    >
                      ▸ {meta.subtreeSize[i]} hidden
                    </span>
                  )}
                </div>
                {cur.path && (
                  <div
                    className="mono faint"
                    style={{
                      fontSize: 10.5,
                      marginTop: 2,
                      overflowWrap: 'anywhere',
                      lineHeight: 1.4,
                    }}
                  >
                    {cur.path}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      {totalSteps !== undefined && limitNote !== undefined && totalSteps > limitNote && (
        <div
          className="faint"
          style={{ fontSize: 11, padding: '10px 4px', textAlign: 'center' }}
        >
          Showing first {limitNote} of {totalSteps} steps.
        </div>
      )}
    </>
  )
}
