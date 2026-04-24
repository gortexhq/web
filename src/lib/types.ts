// Types matching Gortex Go structs

export type NodeKind = 'file' | 'package' | 'function' | 'method' | 'type' | 'interface' | 'variable' | 'import' | 'contract'
export type EdgeKind = 'calls' | 'imports' | 'defines' | 'implements' | 'extends' | 'references' | 'member_of' | 'instantiates' | 'provides' | 'consumes'

export interface GortexNode {
  id: string
  kind: NodeKind
  name: string
  qual_name?: string
  file_path: string
  start_line: number
  end_line: number
  language: string
  meta?: Record<string, unknown>
  repo_prefix?: string
}

export interface GortexEdge {
  from: string
  to: string
  kind: EdgeKind
  file_path: string
  line: number
  confidence?: number
  cross_repo?: boolean
  meta?: Record<string, unknown>
}

export interface RepoStats {
  total_nodes: number
  total_edges: number
  by_kind: Record<string, number>
  by_language: Record<string, number>
}

export interface GraphStats extends RepoStats {
  per_repo?: Record<string, RepoStats>
}

export interface HealthResponse {
  status: string
  indexed: boolean
  nodes: number
  edges: number
  version: string
  uptime_seconds: number
}

export interface ToolInfo {
  name: string
  description: string
}

export interface ToolResponse {
  content: { type: string; text: string }[]
  isError?: boolean
}

export interface SubGraph {
  nodes: GortexNode[]
  edges: GortexEdge[] | null
  total_nodes: number
  total_edges: number
  truncated: boolean
}

export interface GraphData {
  nodes: GortexNode[]
  edges: GortexEdge[]
  stats: GraphStats
}

export interface Community {
  id: string
  label: string
  members: string[]
  files: string[]
  size: number
  cohesion: number
}

export interface CommunityResult {
  communities: Community[]
  modularity: number
}

export interface Process {
  id: string
  name: string
  entry_point: string
  // Flat DFS preorder; depth reconstructs the call tree. See
  // internal/analysis/processes.go::Step.
  steps: { id: string; depth: number }[]
  step_count: number
  files: string[]
  file_count: number
  score: number
}

export interface GraphChangeEvent {
  file_path: string
  kind: 'created' | 'modified' | 'deleted' | 'renamed'
  nodes_added: number
  nodes_removed: number
  edges_added: number
  edges_removed: number
  timestamp: string
  duration_ms: number
}

export interface IndexHealth {
  health_score: number
  node_count: number
  edge_count: number
  successfully_indexed: number
  total_detected: number
  language_coverage: Record<string, boolean>
  last_index_time: string
}

export interface CaveatEntry {
  id: string
  severity: 'risk' | 'hot' | 'cycle' | 'unowned' | 'deprecated' | 'boundary'
  symbol: string
  title: string
  desc: string
  owner: string
  age: string
}

export interface CaveatsResponse {
  caveats: CaveatEntry[]
}

export interface ActivityResponse {
  events: GraphChangeEvent[]
}

export interface DashboardSnapshot {
  stats: {
    total_nodes: number
    total_edges: number
    by_kind: Record<string, number>
    by_language: Record<string, number>
  }
  caveats: number
  activity: number
}
