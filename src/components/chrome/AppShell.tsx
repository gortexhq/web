'use client'

import { useEffect } from 'react'
import { Topbar } from './Topbar'
import { SideRail } from './SideRail'
import { StatusBar } from './StatusBar'
import { TweaksPanel } from './Tweaks'
import { CommandPalette } from './CommandPalette'
import { SymbolInspector } from './SymbolInspector'
import { useTweaks } from '@/lib/tweaks'

export function AppShell({ children }: { children: React.ReactNode }) {
  const layout = useTweaks((s) => s.layout)
  const theme = useTweaks((s) => s.theme)
  const density = useTweaks((s) => s.density)

  // Apply theme + density to <html> early so first paint matches.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  return (
    <div className="app" data-layout={layout}>
      <Topbar />
      <div className="body">
        <SideRail />
        <main className="main">{children}</main>
        <aside className="inspector">
          <SymbolInspector />
        </aside>
      </div>
      <StatusBar />
      <CommandPalette />
      <TweaksPanel />
    </div>
  )
}
