import type { Caveat } from './schema'

// Severity → short recommendation surfaced under each caveat row and
// in the Inspector. Kept close to the list so copy changes don't
// require editing the page component. Text is deliberately imperative
// and short — the row already carries desc + metrics, advice is the
// "what to do" line.
const ADVICE: Record<Caveat['severity'], string> = {
  hot: 'Treat as a stable API. Coordinate any signature change with external callers before merging.',
  deprecated: 'No incoming references. Confirm with owners, then delete with the removal noted in the PR.',
  cycle: 'Break the cycle by extracting a shared interface or moving the type to a neutral package.',
  unowned: 'Assign an owner in CODEOWNERS / team mapping so changes can be reviewed by the right people.',
  boundary: 'Crosses a community boundary. Check whether the dependency should be inverted or routed through an adapter.',
  risk: 'Multiple risk indicators stacked on this symbol — read the description and review before editing.',
}

export function adviceFor(severity: Caveat['severity']): string {
  return ADVICE[severity] ?? ''
}
