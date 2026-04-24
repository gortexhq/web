import type { GortexNode, GortexEdge, GraphData, NodeKind } from '@/lib/types'
import type { Repo } from '@/lib/schema'

// Returns a map repo_prefix -> Repo for quick lookup during rendering.
export function reposByPrefix(repos: Repo[]): Map<string, Repo> {
  const m = new Map<string, Repo>()
  for (const r of repos) {
    const key = r.owner ? `${r.owner}/${r.id}` : r.id
    m.set(key, r)
    m.set(r.id, r)
  }
  return m
}

// Deterministic fallback colour derived from the repo prefix. Mirrors the
// server-side paletteFor() so UI-only callers (lone nodes with an unknown
// repo) stay consistent.
const FALLBACK_COLORS = [
  '#7aa2f7', '#9ece6a', '#bb9af7', '#f7768e', '#e0af68',
  '#73daca', '#ff9e64', '#7dcfff', '#b4f9f8', '#c0caf5',
]
export function fallbackRepoColor(prefix: string): string {
  let h = 0
  for (let i = 0; i < prefix.length; i++) h = (h * 31 + prefix.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]
}

export function repoColor(prefix: string, index: Map<string, Repo>): string {
  return index.get(prefix)?.color ?? fallbackRepoColor(prefix)
}

// Computes undirected degree for every node ID present in `nodes`.
export function computeDegree(nodes: GortexNode[], edges: GortexEdge[]): Map<string, number> {
  const present = new Set(nodes.map((n) => n.id))
  const deg = new Map<string, number>()
  for (const n of nodes) deg.set(n.id, 0)
  for (const e of edges) {
    if (!present.has(e.from) || !present.has(e.to)) continue
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1)
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1)
  }
  return deg
}

// Groups nodes by repo prefix; unknown/empty prefix bucketed under '_unknown'.
export function groupByRepo(nodes: GortexNode[]): Map<string, GortexNode[]> {
  const out = new Map<string, GortexNode[]>()
  for (const n of nodes) {
    const key = n.repo_prefix || '_unknown'
    const arr = out.get(key) ?? []
    arr.push(n)
    out.set(key, arr)
  }
  return out
}

// Stable lexicographic order by (kind, name, id) so renders don't shuffle.
export function stableSortByDegreeDesc(nodes: GortexNode[], deg: Map<string, number>): GortexNode[] {
  return [...nodes].sort((a, b) => {
    const da = deg.get(a.id) ?? 0
    const db = deg.get(b.id) ?? 0
    if (db !== da) return db - da
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1
    if (a.name !== b.name) return a.name < b.name ? -1 : 1
    return a.id < b.id ? -1 : 1
  })
}

// Picks up to `limit` highest-degree nodes per repo. Skymap/skyline/etc.
// all share this so their densities remain consistent across 3D modes.
export function sampleTopPerRepo(
  graph: GraphData,
  limit: number,
): { buckets: Map<string, GortexNode[]>; degree: Map<string, number> } {
  const degree = computeDegree(graph.nodes, graph.edges)
  const buckets = groupByRepo(graph.nodes)
  const out = new Map<string, GortexNode[]>()
  for (const [repo, arr] of buckets) {
    const sorted = stableSortByDegreeDesc(arr, degree).slice(0, limit)
    out.set(repo, sorted)
  }
  return { buckets: out, degree }
}

export function isCaveatHot(n: GortexNode, degree: number, threshold: number): boolean {
  return degree >= threshold
}

export function shortName(n: GortexNode, max = 28): string {
  return n.name.length > max ? n.name.slice(0, max - 1) + '…' : n.name
}

// Deterministic seeded PRNG — used only for jitter inside a fixed layout,
// not for faking data. Kept so cluster layouts avoid overlapping circles.
export function seededRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s & 0xfffffff) / 0xfffffff
  }
}

export type RepoLayout = {
  id: string
  repo: Repo | null
  color: string
  cx: number
  cy: number
  radius: number
  nodes: GortexNode[]
}

// Arranges repos on a soft grid sized by node count. `visibleRepos` orders
// them stably and controls which prefixes are drawn.
export function layoutRepos(
  visibleRepos: Repo[],
  buckets: Map<string, GortexNode[]>,
  W: number,
  H: number,
): RepoLayout[] {
  const repoList = visibleRepos.filter((r) => (buckets.get(r.id)?.length ?? 0) > 0)
  if (repoList.length === 0) return []
  const cols = Math.min(repoList.length, Math.ceil(Math.sqrt(repoList.length * 1.4)))
  const rows = Math.max(1, Math.ceil(repoList.length / cols))
  const cellW = W / cols
  const cellH = H / rows
  return repoList.map((r, i) => {
    const bucket = buckets.get(r.id) ?? []
    const size = bucket.length
    const radius = Math.max(40, Math.min(Math.min(cellW, cellH) * 0.42, 40 + Math.sqrt(size) * 10))
    return {
      id: r.id,
      repo: r,
      color: r.color,
      cx: cellW * (i % cols) + cellW / 2,
      cy: cellH * Math.floor(i / cols) + cellH / 2,
      radius,
      nodes: bucket,
    }
  })
}

export function kindColorVar(k?: NodeKind | string): string {
  switch (k) {
    case 'function':  return 'var(--k-function)'
    case 'method':    return 'var(--k-method)'
    case 'type':      return 'var(--k-type)'
    case 'interface': return 'var(--k-interface)'
    case 'variable':  return 'var(--k-variable)'
    case 'contract':  return 'var(--k-contract)'
    case 'file':      return 'var(--fg-3)'
    default:          return 'var(--fg-2)'
  }
}
