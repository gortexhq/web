// UI-shaped types matching the new /v1/* endpoints (server/dashboard.go).
// Kept narrow on purpose — pages should consume these and never the raw
// MCP tool payloads, so a server-side reshape doesn't ripple through
// every component.

export type Repo = {
  id: string
  owner: string
  lang: string
  nodes: number
  edges: number
  funcs: number
  methods: number
  types: number
  interfaces: number
  vars: number
  files: number
  color: string
}

export type ProcessCategory = 'product' | 'tests' | 'internal'

export type Process = {
  id: string
  name: string
  entry: string
  steps: number
  files: number
  repos: number
  score: number
  risk: 'ok' | 'warn' | 'risk'
  crosses: string[]
  category: ProcessCategory
}

export type ContractKind = 'REST' | 'EVENT' | 'URL' | 'ENV' | 'DEP'
export type ContractType =
  | 'http'
  | 'grpc'
  | 'graphql'
  | 'topic'
  | 'ws'
  | 'env'
  | 'openapi'
  | 'dependency'
export type ContractScope = 'own' | 'external'

export type ContractLocation = {
  role: 'provider' | 'consumer' | string
  repo_prefix: string
  symbol_id: string
  file_path: string
  line: number
  meta?: Record<string, unknown>
}

export type ContractSchema = {
  request_type?: string
  response_type?: string
  request_expr?: string
  response_expr?: string
  request_stream?: boolean
  response_stream?: boolean
  path_params?: string[]
  query_params?: string[]
  status_codes?: number[]
  source?: 'extracted' | 'partial' | 'none' | string
}

// TypeShapeField mirrors contracts.ShapeField on the Go side. It's the
// field-level snapshot of a type that's referenced as a request /
// response body. Populated on the type node's Meta["shape"] during
// indexing.
export type TypeShapeField = {
  name: string
  type: string
  json_tag?: string
  required: boolean
  repeated?: boolean
  comment?: string
}

export type TypeShape = {
  kind: 'struct' | 'interface' | 'type' | 'class' | 'message' | string
  fields: TypeShapeField[]
  notes?: string[]
}

// ContractIssue mirrors contracts.ContractIssue on the Go side. It's
// the output of `contracts validate` — one record per diff between a
// provider's and consumer's shape for a given contract ID.
export type ContractIssueSeverity = 'breaking' | 'warning' | 'info' | string

export type ContractIssue = {
  contract_id: string
  kind: string
  severity: ContractIssueSeverity
  provider?: string
  consumer?: string
  field?: string
  details?: string
  provider_type?: string
  consumer_type?: string
}

export type ContractValidationSummary = {
  total: number
  breaking: number
  warning: number
  info: number
}

export type ContractValidation = {
  issues: ContractIssue[]
  summary: ContractValidationSummary
}

export type Contract = {
  id: string
  name: string
  kind: ContractKind | string
  type: ContractType | string
  scope: ContractScope
  producer: string
  consumers: string[]
  version: string
  breaking: boolean
  callers: number
  last: string
  locations: ContractLocation[]
  schema?: ContractSchema
  /**
   * Side-specific schemas. When both are present the UI renders them
   * side-by-side so provider / consumer mismatches are visible at a
   * glance. When only one side is indexed, that side gets the full
   * width. `schema` (merged) is still sent as a convenience for
   * callers that just want the best-known view.
   */
  provider_schema?: ContractSchema
  consumer_schema?: ContractSchema
}

export type Community = {
  id: string
  name: string
  repo: string
  symbols: number
  files: number
  cohesion: number
}

export type Guard = {
  id: string
  name: string
  kind: string
  status: 'ok' | 'warn' | 'violated' | string
  hits: number
  scope: string
}

export type Caveat = {
  id: string
  severity: 'risk' | 'hot' | 'cycle' | 'unowned' | 'deprecated' | 'boundary'
  symbol: string
  title: string
  desc: string
  owner: string
  age: string
  // Graph-enriched fields from /v1/caveats. All optional — cycle
  // entries and caveats whose symbol is no longer in the index carry
  // no graph data, and the UI must treat zero/empty as "unknown",
  // not "none".
  file_path?: string
  repo_prefix?: string
  kind?: string
  fan_in?: number
  external_callers?: number
  caller_repos?: string[]
}

export type Activity = {
  file_path: string
  kind: 'created' | 'modified' | 'deleted' | 'renamed' | string
  nodes_added: number
  nodes_removed: number
  edges_added: number
  edges_removed: number
  timestamp: string
  duration_ms: number
}

export type KindCount = { name: string; count: number }
export type LanguageCount = { name: string; count: number }

export type DashboardSnapshot = {
  stats: {
    total_nodes: number
    total_edges: number
    repos: number
    caveats: number
    version: string
  }
  kinds: KindCount[]
  languages: LanguageCount[]
  repos: Repo[]
  activity: Activity[]
  caveats: Caveat[]
  processes: Process[]
}
