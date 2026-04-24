'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'ink' | 'paper' | 'terminal'
export type Layout = 'tri' | 'workspace' | 'cmdk'
export type Scope = 'federated' | 'single'
export type CaveatDensity = 'inline' | 'dots' | 'off'
export type Density = 'comfortable' | 'compact'

export type Tweaks = {
  theme: Theme
  layout: Layout
  scope: Scope
  caveats: CaveatDensity
  graphStyle: 'constellation' | 'tree' | 'sankey' | '3d'
  density: Density
  showMinimap: boolean
}

const initial: Tweaks = {
  theme: 'ink',
  layout: 'tri',
  scope: 'federated',
  caveats: 'inline',
  graphStyle: 'constellation',
  density: 'comfortable',
  showMinimap: false,
}

type Store = Tweaks & {
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  set: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void
}

export const useTweaks = create<Store>()(
  persist(
    (set) => ({
      ...initial,
      panelOpen: false,
      setPanelOpen: (panelOpen) => set({ panelOpen }),
      set: (key, value) => set({ [key]: value } as Partial<Store>),
    }),
    {
      name: 'gortex:tweaks',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        layout: s.layout,
        scope: s.scope,
        caveats: s.caveats,
        graphStyle: s.graphStyle,
        density: s.density,
        showMinimap: s.showMinimap,
      }),
    },
  ),
)
