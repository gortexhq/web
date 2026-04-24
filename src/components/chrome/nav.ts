export type NavItem = {
  id: string
  href: string
  label: string
  icon: string
  num?: string | null
  kbd?: string
}

// Side-rail navigation. The optional `num` shown next to each item is
// supplied at render time from /v1/dashboard counts so the rail always
// reflects the live graph (see SideRail.tsx).
export const NAV: NavItem[] = [
  { id: 'dashboard',     href: '/',                label: 'Dashboard',     icon: 'dash' },
  { id: 'graph',         href: '/graph',           label: 'Graph',         icon: 'graph' },
  { id: 'search',        href: '/search',          label: 'Search',        icon: 'search', kbd: '⌘K' },
  { id: 'communities',   href: '/communities',     label: 'Communities',   icon: 'users' },
  { id: 'processes',     href: '/processes',       label: 'Processes',     icon: 'route' },
  { id: 'contracts',     href: '/contracts',       label: 'Contracts',     icon: 'plug' },
  { id: 'services',      href: '/services',        label: 'Services',      icon: 'service' },
  { id: 'investigations',href: '/investigations',  label: 'Investigations',icon: 'flask' },
  { id: 'caveats',       href: '/caveats',         label: 'Caveats',       icon: 'warn' },
  { id: 'guards',        href: '/guards',          label: 'Guards',        icon: 'beaker' },
]

export const PAGE_CRUMBS: Record<string, { label: string; href?: string }[]> = {
  dashboard:      [{ label: 'Gortex', href: '/' }, { label: 'Dashboard' }],
  graph:          [{ label: 'Gortex', href: '/' }, { label: 'Graph' }],
  search:         [{ label: 'Gortex', href: '/' }, { label: 'Search' }],
  communities:    [{ label: 'Gortex', href: '/' }, { label: 'Communities' }],
  processes:      [{ label: 'Gortex', href: '/' }, { label: 'Processes' }],
  contracts:      [{ label: 'Gortex', href: '/' }, { label: 'Contracts' }],
  services:       [{ label: 'Gortex', href: '/' }, { label: 'Services' }],
  investigations: [{ label: 'Gortex', href: '/' }, { label: 'Investigations' }, { label: 'Email ingest 500s' }],
  caveats:        [{ label: 'Gortex', href: '/' }, { label: 'Caveats' }],
  guards:         [{ label: 'Gortex', href: '/' }, { label: 'Guards' }],
  symbol:         [{ label: 'Gortex', href: '/' }, { label: 'Symbol' }],
}
