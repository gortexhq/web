'use client'

import { useEffect, useRef, useState } from 'react'
import { api, type ProcessDetail } from './api'
import type {
  Repo, Process, Contract, Caveat, Activity, Guard, Community,
  DashboardSnapshot, ContractValidation,
} from './schema'
import type { GraphData } from './types'

type Async<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// useAsync runs an async fetcher on mount and exposes loading / error
// state. It re-runs whenever any item in `deps` changes, and `refetch`
// triggers a manual reload (used by reconnect / SSE invalidation).
function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tick = useRef(0)

  const run = () => {
    const t = ++tick.current
    setLoading(true)
    setError(null)
    fetcher()
      .then((r) => {
        if (t !== tick.current) return
        setData(r)
        setError(null)
      })
      .catch((e: Error) => {
        if (t !== tick.current) return
        setError(e.message)
        setData(null)
      })
      .finally(() => {
        if (t !== tick.current) return
        setLoading(false)
      })
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: run }
}

export function useDashboard(): Async<DashboardSnapshot> {
  return useAsync(() => api.dashboard())
}

export function useRepos(): Async<Repo[]> {
  return useAsync(async () => (await api.repos()).repos)
}

export function useGraph(opts?: { project?: string; repo?: string }): Async<GraphData> {
  const project = opts?.project ?? ''
  const repo = opts?.repo ?? ''
  return useAsync(() => api.getGraph({ project: project || undefined, repo: repo || undefined }), [project, repo])
}

export function useProcesses(): Async<Process[]> {
  return useAsync(async () => (await api.processes()).processes)
}

export function useProcessDetail(id: string | null): Async<ProcessDetail | null> {
  return useAsync(async () => (id ? api.processDetail(id) : Promise.resolve(null)), [id])
}

export function useSymbolSource(id: string | null): Async<string> {
  return useAsync(async () => (id ? api.getSymbolSource(id) : Promise.resolve('')), [id])
}

export function useSymbol(id: string | null) {
  return useAsync(async () => (id ? api.getSymbol(id) : Promise.resolve(null)), [id])
}

export function useContracts(): Async<Contract[]> {
  return useAsync(async () => (await api.contracts()).contracts)
}

export function useContractValidation(): Async<ContractValidation> {
  return useAsync(async () => api.contractsValidate())
}

export function useCommunities(): Async<{ communities: Community[]; modularity: number }> {
  return useAsync(async () => api.communities())
}

export function useGuards(): Async<Guard[]> {
  return useAsync(async () => (await api.guards()).guards)
}

export function useCaveats(): Async<Caveat[]> {
  return useAsync(async () => (await api.caveats()).caveats)
}

export function useActivity(limit = 20): Async<Activity[]> {
  return useAsync(async () => (await api.activity(limit)).events, [limit])
}

export function useSymbolSearch(query: string, limit = 20) {
  return useAsync(() => api.searchSymbols(query, limit), [query, limit])
}

// Recent search history is stored in localStorage — the server does not
// persist user history. `push` adds/updates an entry; `clear` wipes.
export type RecentSearch = { q: string; kind: string; hits: number; ts: number }
const RECENT_KEY = 'gortex:recents'
const RECENT_MAX = 8

function readRecents(): RecentSearch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentSearch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useRecentSearches(): {
  recents: RecentSearch[]
  push: (entry: Omit<RecentSearch, 'ts'>) => void
  clear: () => void
} {
  const [recents, setRecents] = useState<RecentSearch[]>([])
  useEffect(() => { setRecents(readRecents()) }, [])
  const push = (entry: Omit<RecentSearch, 'ts'>) => {
    const now = Date.now()
    const next = [{ ...entry, ts: now }, ...readRecents().filter((e) => e.q !== entry.q)].slice(0, RECENT_MAX)
    if (typeof window !== 'undefined') window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    setRecents(next)
  }
  const clear = () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(RECENT_KEY)
    setRecents([])
  }
  return { recents, push, clear }
}

export function useUsages(id: string | null) {
  return useAsync(async () => (id ? api.findUsages(id) : Promise.resolve(null)), [id])
}

export function useDependencies(id: string | null) {
  return useAsync(async () => (id ? api.getDependencies(id) : Promise.resolve(null)), [id])
}
