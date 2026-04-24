// Shared helpers for rendering process flow steps. Both the Processes
// page (3-col exploration view) and the Investigations page (top-flow
// focused view) parse and label steps the same way — keep this file as
// the single source of truth so the two screens stay in sync.

export type StepInfo = {
  repo: string
  path: string
  symbol: string
  // kind reflects where the target lives. 'firstParty' is indexed code
  // in one of the tracked repos; the rest are resolver-emitted stubs
  // (see internal/resolver/resolver.go — resolveImport / resolveExtern
  // and the builtin classifier in builtins.go).
  kind: 'firstParty' | 'stdlib' | 'dep' | 'external' | 'builtin' | 'unresolved'
}

export function parseStepId(id: string): StepInfo {
  // `builtin::<lang>::<category>::<method>` — classifier output for
  // language built-ins (String.startsWith, Array.push, list.append, …)
  // that the resolver couldn't attribute to an import.
  if (id.startsWith('builtin::')) {
    const rest = id.slice('builtin::'.length)
    const parts = rest.split('::')
    const method = parts[parts.length - 1] ?? ''
    const path = parts.slice(0, -1).join(' · ')
    return { repo: 'builtin', path, symbol: method, kind: 'builtin' }
  }
  // Prefixes emitted by the resolver for externs — no real file to read.
  if (id.startsWith('stdlib::') || id.startsWith('dep::')) {
    const rest = id.slice(id.indexOf('::') + 2)
    const sym = rest.lastIndexOf('::')
    const path = sym >= 0 ? rest.slice(0, sym) : rest
    const symbol = sym >= 0 ? rest.slice(sym + 2) : ''
    return {
      repo: id.startsWith('stdlib::') ? 'stdlib' : 'dep',
      path,
      symbol,
      kind: id.startsWith('stdlib::') ? 'stdlib' : 'dep',
    }
  }
  if (id.startsWith('external::')) {
    const rest = id.slice('external::'.length)
    const sym = rest.lastIndexOf('::')
    const path = sym >= 0 ? rest.slice(0, sym) : rest
    const symbol = sym >= 0 ? rest.slice(sym + 2) : ''
    return { repo: 'external', path, symbol, kind: 'external' }
  }
  if (id.startsWith('unresolved::')) {
    const sym = id.slice('unresolved::'.length).replace(/^\*\./, '')
    return { repo: '', path: '', symbol: sym, kind: 'unresolved' }
  }
  const sepIdx = id.indexOf('::')
  const pathPart = sepIdx >= 0 ? id.slice(0, sepIdx) : id
  const symbol = sepIdx >= 0 ? id.slice(sepIdx + 2) : id
  const slashIdx = pathPart.indexOf('/')
  if (slashIdx >= 0) {
    return {
      repo: pathPart.slice(0, slashIdx),
      path: pathPart.slice(slashIdx + 1),
      symbol,
      kind: 'firstParty',
    }
  }
  return { repo: '', path: pathPart, symbol, kind: 'firstParty' }
}

// crossLabel formats the other side of a repo-hop arrow. First-party
// steps show the repo name; externs show "stdlib (encoding/json)" so
// the user sees both the bucket and which package was called.
export function crossLabel(s: StepInfo): string {
  if (s.kind === 'stdlib') return s.path ? `stdlib (${s.path})` : 'stdlib'
  if (s.kind === 'dep') return s.path ? `dep (${s.path})` : 'dep'
  if (s.kind === 'external') return s.path ? `external (${s.path})` : 'external'
  if (s.kind === 'builtin') return s.path ? `builtin (${s.path})` : 'builtin'
  if (s.kind === 'unresolved') return 'unresolved'
  return s.repo || '—'
}
