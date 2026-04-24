import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Heuristic: does this node ID / file path live in test code?
// Matches Go (_test.go), JS/TS (*.test.*, *.spec.*, /__tests__/),
// Dart (_test.dart), Python (_test.py, test_*.py) and common
// /test/ /tests/ /testdata/ directories. Operates on the path
// portion of a symbol ID ("<repo>/<path>::<symbol>") so it is safe
// to call with either the raw symbol ID or just the file path.
export function isTestSymbol(id: string): boolean {
  if (!id) return false
  const p = pathOf(id)
  return (
    p.endsWith('_test.go') ||
    p.endsWith('_test.dart') ||
    p.endsWith('_test.py') ||
    /\/test_[^/]+\.py$/.test(p) ||
    /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p) ||
    p.includes('/__tests__/') ||
    p.includes('/testdata/') ||
    /(^|\/)tests?\//.test(p)
  )
}

// Heuristic: is this symbol vendored / third-party code rather than
// first-party source? We only match directories that are unambiguously
// controlled by a package manager — dirs like `external/` are too
// generic (real applications have features named "external") and
// would misclassify first-party code. The authoritative list is in
// internal/excludes/builtin.go; this is a safety net for repos that
// commit vendored trees anyway (Pods/, vendor/, node_modules/...).
export function isVendoredSymbol(id: string): boolean {
  if (!id) return false
  const p = pathOf(id)
  return (
    p.includes('/pods/') ||
    p.includes('/node_modules/') ||
    p.includes('/vendor/') ||
    p.includes('/pkg/mod/') ||
    p.includes('/.gradle/') ||
    p.includes('/.bundle/') ||
    p.includes('/site-packages/') ||
    p.includes('/.venv/') ||
    p.includes('/venv/') ||
    p.includes('/.pub-cache/') ||
    p.includes('/.dart_tool/') ||
    p.includes('/.cargo/registry/') ||
    p.includes('/.m2/') ||
    p.includes('/sourcepackages/') ||
    p.includes('/third_party/') ||
    p.includes('/third-party/')
  )
}

// Returns the lowercased path portion of a gortex node ID so classifier
// heuristics don't have to repeat the split/lowercase boilerplate.
function pathOf(id: string): string {
  return id.split('::', 1)[0].toLowerCase()
}

export type CodeScope = 'yours' | 'tests' | 'deps' | 'all'

// Maps a symbol ID into one of the four scope buckets. Ordering
// matters: dependency paths often also contain `/test/` (e.g.
// `node_modules/foo/test/...`), and we treat those as deps — the
// user isn't going to fix upstream test hotspots either way.
export function scopeOf(id: string): Exclude<CodeScope, 'all'> {
  if (isVendoredSymbol(id)) return 'deps'
  if (isTestSymbol(id)) return 'tests'
  return 'yours'
}
