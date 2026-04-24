'use client'

import { useMemo } from 'react'
import { type ThreeEvent, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export type ThreeNode = {
  pos: THREE.Vector3
  color: THREE.Color
}

// THREE.Color does not parse CSS color-4 (oklch/oklab/color()). Let the
// browser's CSSOM normalise via getComputedStyle — it always returns
// `rgb(...)` / `rgba(...)` for standard (non-wide-gamut) colors, which
// THREE.Color handles. Cached, keyed by raw input.
let _probe: HTMLSpanElement | null = null
const _cssCache = new Map<string, string>()
export function normalizeCssColor(raw: string, fallback = '#9ece6a'): string {
  if (typeof document === 'undefined') return fallback
  const cached = _cssCache.get(raw)
  if (cached) return cached
  if (!_probe) {
    _probe = document.createElement('span')
    _probe.style.display = 'none'
    document.body.appendChild(_probe)
  }
  _probe.style.color = ''
  _probe.style.color = raw
  if (!_probe.style.color) {
    _cssCache.set(raw, fallback)
    return fallback
  }
  const resolved = getComputedStyle(_probe).color || fallback
  // Fall back if the browser returned a wide-gamut color() form THREE can't read.
  const out = /^rgba?\(/.test(resolved) ? resolved : fallback
  _cssCache.set(raw, out)
  return out
}

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 }
  return h
}

// Sets the raycaster Points threshold once per Canvas. Default (1.0) is too
// coarse at our scene scale (unit ~= 0.1 per node) and causes mis-picks.
export function RaycastThreshold({ threshold }: { threshold: number }) {
  const { raycaster } = useThree()
  raycaster.params.Points = { threshold }
  return null
}

const POINT_VERT = /* glsl */`
attribute vec3 color;
attribute float size;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  #ifdef USE_SIZE_ATTENUATION
    gl_PointSize = size * (300.0 / -mv.z);
  #else
    gl_PointSize = size;
  #endif
  gl_Position = projectionMatrix * mv;
}
`

const POINT_FRAG = /* glsl */`
precision mediump float;
uniform float uOpacity;
varying vec3 vColor;
void main() {
  vec2 xy = gl_PointCoord - vec2(0.5);
  float r2 = dot(xy, xy);
  if (r2 > 0.25) discard;
  float a = 1.0 - smoothstep(0.2, 0.25, r2);
  gl_FragColor = vec4(vColor, a * uOpacity);
}
`

// One draw call for N points. Either pass `size` for a uniform size, or
// `sizes(i)` for per-node sizing. Pass `forceColor` to recolor every
// point (used for "hot" overlays). Clicks report `event.index` which
// indexes back into the original `nodes` array passed by the caller.
// Points render as soft circles via a small ShaderMaterial.
export function PointsCloud({
  nodes, size, sizes, onClick, forceColor, opacity = 0.95, sizeAttenuation = true,
}: {
  nodes: ThreeNode[]
  size?: number
  sizes?: (i: number) => number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  forceColor?: string
  opacity?: number
  sizeAttenuation?: boolean
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    if (nodes.length === 0) return g
    const positions = new Float32Array(nodes.length * 3)
    const colors = new Float32Array(nodes.length * 3)
    const sizeArr = new Float32Array(nodes.length)
    const override = forceColor ? new THREE.Color(forceColor) : null
    const defaultSize = size ?? 0.1
    nodes.forEach((n, i) => {
      positions[i * 3] = n.pos.x
      positions[i * 3 + 1] = n.pos.y
      positions[i * 3 + 2] = n.pos.z
      const c = override ?? n.color
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
      sizeArr[i] = sizes ? sizes(i) : defaultSize
    })
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1))
    return g
  }, [nodes, forceColor, size, sizes])

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: sizeAttenuation ? { USE_SIZE_ATTENUATION: '' } : {},
    uniforms: { uOpacity: { value: opacity } },
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
  }), [sizeAttenuation, opacity])

  if (nodes.length === 0) return null
  return (
    <points onClick={onClick}>
      <primitive object={geom} attach="geometry" />
      <primitive object={material} attach="material" />
    </points>
  )
}

export type LineSeg = { a: THREE.Vector3; b: THREE.Vector3; color: THREE.Color }

export function LineSegs({
  segments, opacity = 0.45,
}: {
  segments: LineSeg[]
  opacity?: number
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    if (segments.length === 0) return g
    const positions = new Float32Array(segments.length * 6)
    const colors = new Float32Array(segments.length * 6)
    segments.forEach((e, i) => {
      positions[i * 6] = e.a.x
      positions[i * 6 + 1] = e.a.y
      positions[i * 6 + 2] = e.a.z
      positions[i * 6 + 3] = e.b.x
      positions[i * 6 + 4] = e.b.y
      positions[i * 6 + 5] = e.b.z
      colors[i * 6] = e.color.r
      colors[i * 6 + 1] = e.color.g
      colors[i * 6 + 2] = e.color.b
      colors[i * 6 + 3] = e.color.r
      colors[i * 6 + 4] = e.color.g
      colors[i * 6 + 5] = e.color.b
    })
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [segments])

  if (segments.length === 0) return null
  return (
    <lineSegments>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial vertexColors transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  )
}

// Small name labels for high-degree hubs. Pre-offset `pos` above the
// node so the caller controls per-view spacing (Constellation sits the
// label above the 2D dot; 3D views lift it above the sphere/plane).
export function TopLabels({
  items,
}: {
  items: Array<{ pos: THREE.Vector3; name: string; id?: string }>
}) {
  return (
    <>
      {items.map((it, i) => (
        <Html
          key={it.id ?? i}
          position={[it.pos.x, it.pos.y, it.pos.z]}
          center
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            color: 'var(--fg-2)',
            font: '9.5px JetBrains Mono, ui-monospace, monospace',
            whiteSpace: 'nowrap',
            opacity: 0.72,
            textShadow: '0 0 3px var(--bg-0), 0 0 2px var(--bg-0)',
            transform: 'translateY(-2px)',
          }}>
            {shortLabel(it.name)}
          </div>
        </Html>
      ))}
    </>
  )
}

export function shortLabel(name: string, max = 24): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', color: 'var(--fg-3)',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12,
    }}>
      {message}
    </div>
  )
}
