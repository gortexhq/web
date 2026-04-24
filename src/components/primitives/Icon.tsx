type Props = { name: string; size?: number; className?: string }

export function Icon({ name, size = 14, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'dash':    return <svg {...common}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
    case 'graph':   return <svg {...common}><circle cx="4" cy="5" r="1.5"/><circle cx="12" cy="4" r="1.5"/><circle cx="8" cy="12" r="1.5"/><path d="M5.2 5.8l5.8-1m-6 1.5l2.5 5m3.5-5l-2 5.5"/></svg>
    case 'search':  return <svg {...common}><circle cx="7" cy="7" r="4"/><path d="M14 14l-4-4"/></svg>
    case 'flask':   return <svg {...common}><path d="M6 2v4l-3 7a2 2 0 0 0 1.9 2.7h6.2A2 2 0 0 0 13 13l-3-7V2"/><path d="M5 2h6M5 9h6"/></svg>
    case 'users':   return <svg {...common}><circle cx="6" cy="6" r="2.5"/><path d="M2 14c.4-2 2-3.5 4-3.5s3.6 1.5 4 3.5"/><circle cx="11.5" cy="5" r="1.8"/><path d="M10.5 10c2 .3 3.2 1.8 3.5 4"/></svg>
    case 'route':   return <svg {...common}><circle cx="3" cy="13" r="1.5"/><circle cx="13" cy="3" r="1.5"/><path d="M4.5 12c1.5-2 6-2 8-7"/></svg>
    case 'plug':    return <svg {...common}><path d="M5 2v3m6-3v3"/><rect x="3" y="5" width="10" height="5" rx="1"/><path d="M8 10v4"/></svg>
    case 'service': return <svg {...common}><path d="M8 1l6 3v4c0 4-3 6.5-6 7-3-.5-6-3-6-7V4z"/></svg>
    case 'beaker':  return <svg {...common}><path d="M3 3h10M5 3v4l-3 6a1 1 0 0 0 1 1.5h10A1 1 0 0 0 14 13l-3-6V3"/></svg>
    case 'chat':    return <svg {...common}><path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3 2v-2a2 2 0 0 1-2-2z"/></svg>
    case 'pin':     return <svg {...common}><path d="M10 1l5 5-3 1-3 4-1.5-1.5L3 14l3.5-4.5L5 8l4-3z"/></svg>
    case 'bolt':    return <svg {...common}><path d="M8 1L3 9h4l-1 6 6-8H8z"/></svg>
    case 'fork':    return <svg {...common}><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="8" cy="13" r="1.5"/><path d="M4 4.5v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3M8 9.5v2"/></svg>
    case 'caret':   return <svg {...common}><path d="M5 4l4 4-4 4"/></svg>
    case 'caretdn': return <svg {...common}><path d="M4 6l4 4 4-4"/></svg>
    case 'close':   return <svg {...common}><path d="M3 3l10 10M13 3L3 13"/></svg>
    case 'expand':  return <svg {...common}><path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5"/></svg>
    case 'plus':    return <svg {...common}><path d="M8 3v10M3 8h10"/></svg>
    case 'filter':  return <svg {...common}><path d="M2 3h12l-5 6v4l-2 1V9z"/></svg>
    case 'fit':     return <svg {...common}><path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3"/></svg>
    case 'layers':  return <svg {...common}><path d="M8 1l7 3.5L8 8 1 4.5z"/><path d="M1 8l7 3.5L15 8M1 11.5L8 15l7-3.5"/></svg>
    case 'cube':    return <svg {...common}><path d="M8 1l6 3.5v7L8 15l-6-3.5v-7z"/><path d="M2 4.5l6 3.5 6-3.5M8 8v7"/></svg>
    case 'sankey':  return <svg {...common}><path d="M1 3h3v4H1zM12 2h3v5h-3zM1 10h3v4H1zM12 9h3v5h-3z"/><path d="M4 5c4 0 4-2 8-2M4 12c4 0 4 2 8 2"/></svg>
    case 'matrix':  return <svg {...common}><rect x="2" y="2" width="3" height="3"/><rect x="6.5" y="2" width="3" height="3"/><rect x="11" y="2" width="3" height="3"/><rect x="2" y="6.5" width="3" height="3"/><rect x="6.5" y="6.5" width="3" height="3"/><rect x="11" y="6.5" width="3" height="3"/><rect x="2" y="11" width="3" height="3"/><rect x="6.5" y="11" width="3" height="3"/><rect x="11" y="11" width="3" height="3"/></svg>
    case 'zoomin':  return <svg {...common}><circle cx="7" cy="7" r="4"/><path d="M14 14l-4-4M7 5v4M5 7h4"/></svg>
    case 'zoomout': return <svg {...common}><circle cx="7" cy="7" r="4"/><path d="M14 14l-4-4M5 7h4"/></svg>
    case 'arrowr':  return <svg {...common}><path d="M3 8h10M9 4l4 4-4 4"/></svg>
    case 'check':   return <svg {...common}><path d="M3 8l3 3 7-7"/></svg>
    case 'warn':    return <svg {...common}><path d="M8 2l6 11H2z"/><path d="M8 6v4M8 12v.01"/></svg>
    case 'info':    return <svg {...common}><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5v.01"/></svg>
    case 'sliders': return <svg {...common}><path d="M3 4h10M3 8h6M3 12h10"/><circle cx="10.5" cy="4" r="1.2"/><circle cx="5.5" cy="12" r="1.2"/></svg>
    case 'history': return <svg {...common}><path d="M2 8a6 6 0 1 0 2-4.5"/><path d="M2 2v3h3M8 5v3l2 1.5"/></svg>
    case 'owner':   return <svg {...common}><circle cx="8" cy="5" r="2.5"/><path d="M3 14c.5-2.5 2.7-4 5-4s4.5 1.5 5 4"/></svg>
    case 'spark':   return <svg {...common}><path d="M2 11l3-5 3 3 5-7"/></svg>
    case 'file':    return <svg {...common}><path d="M4 2h5l3 3v9H4z"/><path d="M9 2v3h3"/></svg>
    case 'copy':    return <svg {...common}><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 11H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2"/></svg>
    case 'share':   return <svg {...common}><path d="M11 2l3 3-3 3M13 5H8a4 4 0 0 0-4 4v5"/></svg>
    case 'save':    return <svg {...common}><path d="M2 2h9l3 3v9H2z"/><path d="M5 2v5h6V2M5 14v-4h6v4"/></svg>
    case 'dot':     return <svg {...common}><circle cx="8" cy="8" r="2"/></svg>
    default:        return <svg {...common}><circle cx="8" cy="8" r="6"/></svg>
  }
}
