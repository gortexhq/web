'use client'

import { useEffect, useState } from 'react'

type SupportedLang =
  | 'go' | 'typescript' | 'tsx' | 'javascript' | 'jsx'
  | 'python' | 'dart' | 'yaml' | 'json' | 'bash' | 'sql'
  | 'rust' | 'java' | 'csharp' | 'ruby' | 'php' | 'kotlin'
  | 'toml' | 'markdown' | 'html' | 'css' | 'text'

const EXT_TO_LANG: Record<string, SupportedLang> = {
  go: 'go',
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  py: 'python',
  dart: 'dart',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  rs: 'rust',
  java: 'java',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  kt: 'kotlin',
  kts: 'kotlin',
  toml: 'toml',
  md: 'markdown',
  mdx: 'markdown',
  html: 'html',
  css: 'css',
}

function inferLang(filePath?: string): SupportedLang {
  if (!filePath) return 'text'
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext]
  return 'text'
}

type Props = {
  code: string
  /** Explicit language. Takes precedence over filePath inference. */
  lang?: SupportedLang
  /** File path used to infer the language from its extension. */
  filePath?: string
  /** CSS max-height applied to the scroll container. Default: 420px. */
  maxHeight?: number | string
  /** Wrap long lines instead of horizontal scroll. Default: false. */
  wrap?: boolean
  /** Extra class name applied to the outer container. */
  className?: string
}

// CodeBlock renders a syntax-highlighted code snippet. Highlighting
// runs asynchronously on the client; we show the raw code immediately
// and swap in the highlighted HTML when the grammar is ready so there
// is never a flash of empty content — and if highlighting fails for
// any reason the raw code remains visible.
export function CodeBlock({
  code,
  lang,
  filePath,
  maxHeight = 420,
  wrap = false,
  className,
}: Props) {
  const resolved: SupportedLang = lang ?? inferLang(filePath)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (resolved === 'text' || !code) {
      setHtml(null)
      return
    }
    import('shiki')
      .then(({ codeToHtml }) =>
        codeToHtml(code, {
          lang: resolved,
          theme: 'github-dark-dimmed',
        }),
      )
      .then((out) => {
        if (!cancelled) setHtml(out)
      })
      .catch(() => {
        if (!cancelled) setHtml(null)
      })
    return () => {
      cancelled = true
    }
  }, [code, resolved])

  const containerStyle: React.CSSProperties = {
    margin: 0,
    background: 'var(--bg-1)',
    border: '1px solid var(--line, var(--line-1))',
    borderRadius: 4,
    fontSize: 12,
    lineHeight: 1.55,
    overflow: 'auto',
    maxHeight,
  }
  const preStyle: React.CSSProperties = {
    margin: 0,
    padding: '10px 12px',
    fontFamily: 'var(--font-mono)',
    whiteSpace: wrap ? 'pre-wrap' : 'pre',
    wordBreak: wrap ? 'break-word' : 'normal',
  }

  if (!html) {
    return (
      <div className={className} style={containerStyle}>
        <pre style={preStyle}>{code}</pre>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={containerStyle}
      data-code-block
      data-wrap={wrap ? 'true' : undefined}
      // shiki returns <pre><code>…</code></pre> with inline styles.
      // The output is a static string of escaped HTML — safe to inject.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
