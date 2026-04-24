'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/primitives/Icon'
import { useTweaks, type Tweaks } from '@/lib/tweaks'

type RowProps<K extends keyof Tweaks> = {
  label: string
  keyName: K
  options: { value: Tweaks[K]; label: string }[]
}

function Row<K extends keyof Tweaks>({ label, keyName, options }: RowProps<K>) {
  const value = useTweaks((s) => s[keyName])
  const set = useTweaks((s) => s.set)
  return (
    <div className="row">
      <div className="label">{label}</div>
      <div className="options">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={`opt ${value === o.value ? 'active' : ''}`}
            onClick={() => set(keyName, o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TweaksPanel() {
  const open = useTweaks((s) => s.panelOpen)
  const setOpen = useTweaks((s) => s.setPanelOpen)
  const theme = useTweaks((s) => s.theme)
  const density = useTweaks((s) => s.density)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  if (!open) {
    return (
      <button type="button" className="tweaks-fab" onClick={() => setOpen(true)} aria-label="Open tweaks">
        <Icon name="sliders" size={16} />
      </button>
    )
  }

  return (
    <div className="tweaks">
      <div className="hd">
        <span>Tweaks</span>
        <button type="button" onClick={() => setOpen(false)} className="mono faint" style={{ fontSize: 11 }}>
          close
        </button>
      </div>
      <Row
        label="Aesthetic"
        keyName="theme"
        options={[
          { value: 'ink', label: 'Ink' },
          { value: 'paper', label: 'Paper' },
          { value: 'terminal', label: 'Terminal' },
        ]}
      />
      <Row
        label="Layout"
        keyName="layout"
        options={[
          { value: 'tri', label: 'IDE tri-pane' },
          { value: 'workspace', label: 'Workspace' },
          { value: 'cmdk', label: 'Command-K' },
        ]}
      />
      <Row
        label="Scope"
        keyName="scope"
        options={[
          { value: 'federated', label: 'Federated' },
          { value: 'single', label: 'Single repo' },
        ]}
      />
      <Row
        label="Caveat density"
        keyName="caveats"
        options={[
          { value: 'inline', label: 'Inline' },
          { value: 'dots', label: 'Dots' },
          { value: 'off', label: 'Off' },
        ]}
      />
      <Row
        label="Density"
        keyName="density"
        options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
        ]}
      />
      <Row
        label="Minimap"
        keyName="showMinimap"
        options={[
          { value: true, label: 'On' },
          { value: false, label: 'Off' },
        ]}
      />
    </div>
  )
}
