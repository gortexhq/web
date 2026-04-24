import type {
  HealthResponse, ToolInfo, GraphStats, ToolResponse, GraphData,
  SubGraph, GortexNode, GraphChangeEvent, IndexHealth,
} from './types'
import type {
  Repo, Process, Contract, Caveat, Activity, Guard, Community,
  DashboardSnapshot, KindCount, LanguageCount, ContractValidation,
} from './schema'

// Single base URL for the gortex server (http://.../v1/*).
const SERVER_URL = process.env.NEXT_PUBLIC_GORTEX_URL
  || process.env.NEXT_PUBLIC_GORTEX_WEB_URL
  || 'http://localhost:4747'

// Optional bearer token. Required when the server was started with
// --auth-token / $GORTEX_SERVER_TOKEN; otherwise leave unset.
const AUTH_TOKEN = process.env.NEXT_PUBLIC_GORTEX_TOKEN || ''

function authHeaders(): HeadersInit {
  return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}
}

async function serverFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server API error ${res.status}: ${text}`)
  }
  return res
}

async function callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const res = await serverFetch(`/v1/tools/${name}`, {
    method: 'POST',
    body: JSON.stringify({ arguments: args }),
  })
  const data: ToolResponse = await res.json()
  if (data.isError) {
    throw new Error(data.content?.[0]?.text || 'Tool call failed')
  }
  return data.content?.map(c => c.text).join('\n') || ''
}

async function callToolJSON<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const text = await callTool(name, args)
  try {
    return JSON.parse(text) as T
  } catch {
    return { nodes: [], edges: [], text } as unknown as T
  }
}

// clipByBraces walks a block of source and keeps the leading lines up
// to (and including) the line that closes the first top-level `{…}`
// block. Used when the parser didn't record end_line, so we still
// render a whole method body without dragging in the following
// declaration. Strings and comments containing braces are imperfect —
// cheap heuristic, not a parser — but works for the usual Dart / TS
// / Go cases we hit in practice. One-liner declarations terminated
// by a bare `;` on their own line short-circuit (abstract methods,
// arrow-body functions, etc.).
function clipByBraces(lines: string[]): string[] {
  let depth = 0
  let opened = false
  const out: string[] = []
  for (const line of lines) {
    out.push(line)
    for (const ch of line) {
      if (ch === '{') {
        depth++
        opened = true
      } else if (ch === '}' && opened) {
        depth--
      }
    }
    if (opened && depth <= 0) return out
    // No brace has opened yet and this line ends a statement — treat
    // it as a one-liner signature (e.g. `int get foo => 42;`).
    if (!opened && /;\s*(\/\/.*)?$/.test(line)) return out
  }
  return out
}

export const api = {
  // --- Health & stats ---
  health: async (): Promise<HealthResponse> => {
    const res = await serverFetch('/v1/health')
    return res.json()
  },

  tools: async (): Promise<ToolInfo[]> => {
    const res = await serverFetch('/v1/tools')
    return res.json()
  },

  stats: async (): Promise<GraphStats> => {
    const res = await serverFetch('/v1/stats')
    return res.json()
  },

  // --- Brief graph dump (force-directed rendering) ---
  getGraph: async (opts?: { project?: string; repo?: string }): Promise<GraphData> => {
    const qs = new URLSearchParams()
    if (opts?.project) qs.set('project', opts.project)
    if (opts?.repo) qs.set('repo', opts.repo)
    const suffix = qs.toString() ? `?${qs}` : ''
    const res = await serverFetch(`/v1/graph${suffix}`)
    return res.json()
  },

  // --- UI-shaped /v1 endpoints (added for the design) ---
  dashboard: async (): Promise<DashboardSnapshot> => {
    const res = await serverFetch('/v1/dashboard')
    return res.json()
  },

  repos: async (): Promise<{ repos: Repo[] }> => {
    const res = await serverFetch('/v1/repos')
    return res.json()
  },

  processes: async (): Promise<{ processes: Process[] }> => {
    const res = await serverFetch('/v1/processes')
    return res.json()
  },

  // Fetches the full step list + files for a single process. Uses the
  // `get_processes` MCP tool with the `id` parameter so the response
  // includes every step's node ID — list endpoints deliberately omit
  // these to keep the summary light.
  processDetail: async (id: string): Promise<ProcessDetail | null> => {
    if (!id) return null
    try {
      return await callToolJSON<ProcessDetail>('get_processes', { id })
    } catch { return null }
  },

  contracts: async (): Promise<{ contracts: Contract[] }> => {
    const res = await serverFetch('/v1/contracts')
    return res.json()
  },

  contractsValidate: async (): Promise<ContractValidation> => {
    const res = await serverFetch('/v1/contracts/validate')
    return res.json()
  },

  communities: async (): Promise<{ communities: Community[]; modularity: number }> => {
    const res = await serverFetch('/v1/communities')
    return res.json()
  },

  guards: async (): Promise<{ guards: Guard[] }> => {
    const res = await serverFetch('/v1/guards')
    return res.json()
  },

  caveats: async (): Promise<{ caveats: Caveat[] }> => {
    const res = await serverFetch('/v1/caveats')
    return res.json()
  },

  activity: async (limit = 50): Promise<{ events: Activity[] }> => {
    const res = await serverFetch(`/v1/activity?limit=${limit}`)
    return res.json()
  },

  // --- Symbol-level MCP tool wrappers ---
  searchSymbols: async (query: string, limit = 20): Promise<SymbolSearchResult[]> => {
    if (!query.trim()) return []
    const text = await callTool('search_symbols', { query, limit, format: 'json' })
    try {
      const parsed = JSON.parse(text) as { results?: SymbolSearchResult[] } | SymbolSearchResult[]
      if (Array.isArray(parsed)) return parsed
      return parsed.results ?? []
    } catch {
      return []
    }
  },

  // Fetches a node with full detail so callers see `meta` (including
  // `meta.shape` populated by the Stage 2 snapshot pass) and end_line.
  // The brief response omits both via json `omitempty` tags and the
  // UI needs the shape to render JSON-preview payloads. The full tool
  // response wraps the node under `.node` alongside in_edges /
  // out_edges — we unwrap to a flat GortexNode for the caller.
  getSymbol: async (id: string): Promise<GortexNode | null> => {
    try {
      const full = await callToolJSON<{ node?: GortexNode } & GortexNode>(
        'get_symbol',
        { id, detail: 'full' },
      )
      // full.node when the tool returns the detailed envelope;
      // otherwise the response IS the node (edge case for legacy
      // callers that left detail unset).
      if (full && typeof full === 'object' && 'node' in full && full.node) {
        return full.node
      }
      return (full as unknown as GortexNode) ?? null
    } catch { return null }
  },

  // Some parsers (Dart, historically the TS extractor) only record a
  // symbol's declaration line, not its end_line — so requesting
  // context_lines: 0 returns just the signature. We ask for a 20-line
  // window around the symbol and then clip locally:
  //   * Skip leading context so rendering starts at start_line.
  //   * If end_line > start_line, trust it and slice that many lines.
  //   * Otherwise brace-balance from the opening `{` to find the real
  //     end of the block. One-liner declarations terminated by `;`
  //     short-circuit so abstract methods and arrow-functions don't
  //     run off the end of the window.
  getSymbolSource: async (id: string, contextLines = 20): Promise<string> => {
    const result = await callTool('get_symbol_source', { id, context_lines: contextLines })
    let parsed: {
      source?: string
      from_line?: number
      start_line?: number
      end_line?: number
    }
    try {
      parsed = JSON.parse(result)
    } catch {
      return result
    }
    const src = parsed.source
    if (typeof src !== 'string' || src.length === 0) return result

    const fromLine = parsed.from_line ?? 1
    const startLine = parsed.start_line ?? fromLine
    const endLine = parsed.end_line ?? startLine

    const allLines = src.split('\n')
    const leadSkip = Math.max(0, startLine - fromLine)
    const bodyLines = allLines.slice(leadSkip)

    if (endLine > startLine) {
      const bodyLen = endLine - startLine + 1
      return bodyLines.slice(0, bodyLen).join('\n')
    }
    return clipByBraces(bodyLines).join('\n')
  },

  getCallers: async (id: string, depth = 2): Promise<SubGraph> => {
    return callToolJSON<SubGraph>('get_callers', { id, depth })
  },

  getCallChain: async (id: string, depth = 2): Promise<SubGraph> => {
    return callToolJSON<SubGraph>('get_call_chain', { id, depth })
  },

  findUsages: async (id: string): Promise<SubGraph> => {
    return callToolJSON<SubGraph>('find_usages', { id })
  },

  getDependencies: async (id: string): Promise<SubGraph> => {
    return callToolJSON<SubGraph>('get_dependencies', { id })
  },

  getDependents: async (id: string): Promise<SubGraph> => {
    return callToolJSON<SubGraph>('get_dependents', { id })
  },

  indexHealth: async (): Promise<IndexHealth> => {
    return callToolJSON<IndexHealth>('index_health', {})
  },

  // --- Raw escape hatches (do not use in pages) ---
  callTool,
  callToolJSON,

  // --- SSE for live activity ---
  subscribeEvents: (callback: (event: GraphChangeEvent) => void): EventSource => {
    const qs = AUTH_TOKEN ? `?token=${encodeURIComponent(AUTH_TOKEN)}` : ''
    const es = new EventSource(`${SERVER_URL}/v1/events${qs}`)
    es.addEventListener('graph_change', (e) => {
      try {
        const data = JSON.parse(e.data) as GraphChangeEvent
        callback(data)
      } catch { /* ignore parse errors */ }
    })
    return es
  },
}

export type { Repo, Process, Contract, Caveat, Activity, Guard, Community, DashboardSnapshot, KindCount, LanguageCount }

export type SymbolSearchResult = {
  id: string
  kind: string
  name: string
  path: string
  line: number
  sig?: string
}

// A ProcessStep is one node in a discovered flow with its call-tree
// depth. The frontend reconstructs the tree by reading depth: the
// parent of step i is the nearest preceding step with depth < i.depth.
// See internal/analysis/processes.go::Step for the producer side.
export type ProcessStep = {
  id: string
  depth: number
}

export type ProcessDetail = {
  id: string
  name: string
  entry_point: string
  steps: ProcessStep[]
  step_count: number
  files: string[]
  score: number
}
