'use client'

import { create } from 'zustand'

type CmdK = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useCmdK = create<CmdK>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
