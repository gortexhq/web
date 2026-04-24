'use client'

import { create } from 'zustand'

// Inspector symbol shape — minimal what the right-pane needs. Can be
// constructed from any source: search results, command-palette picks,
// graph node clicks. Optional fields are filled in lazily as the
// inspector hooks fetch usages / dependencies.
export type InspectorSym = {
  id: string
  kind: 'function' | 'method' | 'type' | 'interface' | 'variable' | string
  name: string
  repo: string
  file: string
  sig: string
  callers: number
  callees: number
  community: string
  caveats: string[]
}

type State = {
  sym: InspectorSym | null
  setSym: (sym: InspectorSym | null) => void
}

export const useInspector = create<State>((set) => ({
  sym: null,
  setSym: (sym) => set({ sym }),
}))
