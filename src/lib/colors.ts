import type { NodeKind, EdgeKind } from './types'

export const NODE_COLORS: Record<NodeKind, string> = {
  file: '#607D8B',
  package: '#bb9af7',
  function: '#7aa2f7',
  method: '#7dcfff',
  type: '#9ece6a',
  interface: '#73daca',
  variable: '#ff9e64',
  import: '#795548',
  contract: '#f7768e',
}

export const EDGE_COLORS: Record<EdgeKind, string> = {
  calls: '#7aa2f7',
  imports: '#565f89',
  defines: '#6b7280',
  implements: '#9ece6a',
  extends: '#bb9af7',
  references: '#3b4261',
  member_of: '#8b8fa3',
  instantiates: '#e0af68',
  provides: '#9ece6a',
  consumes: '#7aa2f7',
}

export const LANGUAGE_COLORS: Record<string, string> = {
  go: '#00ADD8',
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  python: '#3776AB',
  rust: '#DEA584',
  java: '#ED8B00',
  csharp: '#239120',
  kotlin: '#7F52FF',
  swift: '#F05138',
  ruby: '#CC342D',
  php: '#777BB4',
  dart: '#0175C2',
  css: '#1572B6',
  html: '#E34F26',
  markdown: '#083FA1',
  yaml: '#CB171E',
  bash: '#4EAA25',
  sql: '#e38c00',
}
