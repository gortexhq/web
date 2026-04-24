'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Pinned-symbols store. Each entry is the minimum needed to reopen the
// inspector on it — id + name + repo — so the rail can render a
// clickable list without extra graph lookups. IDs are deduped; toggling
// a pin already pinned removes it.
export type Pin = {
  id: string
  name: string
  repo: string
}

type State = {
  pins: Pin[]
  toggle: (p: Pin) => void
  isPinned: (id: string) => boolean
  remove: (id: string) => void
}

export const usePins = create<State>()(
  persist(
    (set, get) => ({
      pins: [],
      toggle: (p) =>
        set((s) =>
          s.pins.some((x) => x.id === p.id)
            ? { pins: s.pins.filter((x) => x.id !== p.id) }
            : { pins: [p, ...s.pins].slice(0, 25) },
        ),
      isPinned: (id) => get().pins.some((p) => p.id === id),
      remove: (id) => set((s) => ({ pins: s.pins.filter((x) => x.id !== id) })),
    }),
    { name: 'gortex:pins' },
  ),
)
