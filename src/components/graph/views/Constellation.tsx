'use client'

import { useMemo, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import Graph from 'graphology'
import forceatlas2 from 'graphology-layout-forceatlas2'
import { useInspector } from '@/lib/inspector'
import type { GraphData, GortexNode } from '@/lib/types'
import type { Repo } from '@/lib/schema'
import { computeDegree } from './layout'
import {
  EmptyState, LineSegs, PointsCloud, RaycastThreshold, TopLabels,
  normalizeCssColor, type LineSeg,
} from './three-common'

const MAX_NODES = 1600
const MAX_EDGES = 3000
const FA2_ITERATIONS = 450
const WORLD_W = 22
const WORLD_H = 13
// Orthographic → point sizes are pixels. size(deg) = BASE + K·log2(deg+1).
const POINT_PX_BASE = 3.5
const POINT_PX_K = 2.2
const HOVER_RING_WORLD = 0.22
const HOT_COLOR = '#f7768e'
const PICK_THRESHOLD = 0.09
const TOP_LABEL_COUNT = 32

type CNode = {
  pos: THREE.Vector3
  color: THREE.Color
  repo: string
  degree: number
  hot: boolean
  id: string
  node: GortexNode
}

export function GraphConstellation({
  graph, repos, filterRepos, filterKinds,
}: {
  graph: GraphData | null
  repos: Repo[]
  filterRepos: Set<string>
  filterKinds: Set<string>
}) {
  const setSym = useInspector((s) => s.setSym)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const { coolNodes, hotNodes, edges, allNodes, neighborsByIdx, topLabels } = useMemo(() => {
    const empty = {
      coolNodes: [] as CNode[],
      hotNodes: [] as CNode[],
      edges: [] as LineSeg[],
      allNodes: [] as CNode[],
      neighborsByIdx: new Map<number, Set<number>>(),
      topLabels: [] as CNode[],
    }
    if (!graph) return empty

    const repoColorByPrefix = new Map<string, string>()
    for (const r of repos) {
      repoColorByPrefix.set(r.id, normalizeCssColor(r.color))
      if (r.owner) repoColorByPrefix.set(`${r.owner}/${r.id}`, normalizeCssColor(r.color))
    }

    const visibleRepoIds = new Set(
      repos
        .filter((r) => !filterRepos.size || filterRepos.has(r.id))
        .map((r) => r.id),
    )

    const degree = computeDegree(graph.nodes, graph.edges)
    const candidates = graph.nodes.filter((n) => {
      if (filterKinds.size && !filterKinds.has(n.kind)) return false
      const prefix = n.repo_prefix || ''
      // accept if the prefix or its last segment matches a visible repo
      const tail = prefix.split('/').pop() ?? prefix
      return visibleRepoIds.has(prefix) || visibleRepoIds.has(tail)
    })
    candidates.sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
    const keep = candidates.slice(0, MAX_NODES)
    const keepIds = new Set(keep.map((n) => n.id))

    if (keep.length === 0) return empty

    // Build graphology graph for FA2.
    const g = new Graph({ multi: false, type: 'undirected' })
    keep.forEach((n, i) => {
      // Seed positions in a small random disc so FA2 has signal to work with.
      const t = (i / Math.max(1, keep.length)) * Math.PI * 2
      const r = 0.5 + Math.random() * 0.2
      g.addNode(n.id, { x: Math.cos(t) * r, y: Math.sin(t) * r })
    })
    for (const e of graph.edges) {
      if (e.from === e.to) continue
      if (!keepIds.has(e.from) || !keepIds.has(e.to)) continue
      if (g.hasEdge(e.from, e.to)) continue
      g.addEdge(e.from, e.to)
    }

    forceatlas2.assign(g, {
      iterations: FA2_ITERATIONS,
      settings: {
        gravity: 1,
        scalingRatio: 12,
        barnesHutOptimize: keep.length > 400,
        barnesHutTheta: 0.5,
        strongGravityMode: false,
        linLogMode: false,
        outboundAttractionDistribution: false,
        slowDown: 1,
        adjustSizes: false,
      },
    })

    // Collect positions, compute bbox, scale into WORLD_W × WORLD_H.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    g.forEachNode((_id, attrs) => {
      if (attrs.x < minX) minX = attrs.x
      if (attrs.y < minY) minY = attrs.y
      if (attrs.x > maxX) maxX = attrs.x
      if (attrs.y > maxY) maxY = attrs.y
    })
    const spanX = Math.max(1e-3, maxX - minX)
    const spanY = Math.max(1e-3, maxY - minY)
    const scale = Math.min(WORLD_W / spanX, WORLD_H / spanY)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const maxDeg = Math.max(1, ...keep.map((n) => degree.get(n.id) ?? 0))
    const hotThreshold = Math.max(8, maxDeg * 0.6)

    const allNodes: CNode[] = []
    const nodeIdToIdx = new Map<string, number>()
    keep.forEach((n, i) => {
      const attrs = g.getNodeAttributes(n.id)
      const prefix = n.repo_prefix || ''
      const repoKey = repoColorByPrefix.has(prefix) ? prefix : (prefix.split('/').pop() ?? prefix)
      const rawCol = repoColorByPrefix.get(repoKey) ?? '#9ece6a'
      const deg = degree.get(n.id) ?? 0
      const node: CNode = {
        pos: new THREE.Vector3((attrs.x - cx) * scale, (attrs.y - cy) * scale, 0),
        color: new THREE.Color(rawCol),
        repo: repoKey,
        degree: deg,
        hot: deg >= hotThreshold,
        id: n.id,
        node: n,
      }
      allNodes.push(node)
      nodeIdToIdx.set(n.id, i)
    })

    const coolNodes: CNode[] = []
    const hotNodes: CNode[] = []
    for (const n of allNodes) (n.hot ? hotNodes : coolNodes).push(n)

    const pink = new THREE.Color(HOT_COLOR)
    const neighborsByIdx = new Map<number, Set<number>>()
    const edges: LineSeg[] = []
    // Rank edges by combined endpoint degree so the top MAX_EDGES favour
    // highly connected pairs and keep the rest of the graph legible.
    const ranked: Array<{ from: number; to: number; cross: boolean }> = []
    for (const e of graph.edges) {
      const fi = nodeIdToIdx.get(e.from)
      const ti = nodeIdToIdx.get(e.to)
      if (fi === undefined || ti === undefined || fi === ti) continue
      ranked.push({ from: fi, to: ti, cross: !!e.cross_repo })
    }
    ranked.sort((a, b) => {
      const da = allNodes[a.from].degree + allNodes[a.to].degree
      const db = allNodes[b.from].degree + allNodes[b.to].degree
      return db - da
    })
    const picked = ranked.slice(0, MAX_EDGES)
    for (const r of picked) {
      const a = allNodes[r.from]
      const b = allNodes[r.to]
      edges.push({
        a: a.pos, b: b.pos,
        color: r.cross ? pink : a.color,
      })
      if (!neighborsByIdx.has(r.from)) neighborsByIdx.set(r.from, new Set())
      if (!neighborsByIdx.has(r.to)) neighborsByIdx.set(r.to, new Set())
      neighborsByIdx.get(r.from)!.add(r.to)
      neighborsByIdx.get(r.to)!.add(r.from)
    }

    const topLabels = [...allNodes]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, TOP_LABEL_COUNT)
    return { coolNodes, hotNodes, edges, allNodes, neighborsByIdx, topLabels }
  }, [graph, repos, filterRepos, filterKinds])

  const pick = (list: CNode[]) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const idx = e.index
    if (idx === undefined) return
    const n = list[idx]
    if (!n) return
    setSym({
      id: n.node.id,
      kind: (n.node.kind as 'function') ?? 'function',
      name: n.node.name,
      repo: n.repo,
      file: n.node.file_path,
      sig: '', callers: 0, callees: 0, community: '', caveats: [],
    })
  }

  const onHover = (list: CNode[]) => (e: ThreeEvent<PointerEvent>) => {
    const idx = e.index
    if (idx === undefined) return
    const n = list[idx]
    if (!n) return
    const globalIdx = allNodes.indexOf(n)
    setHoveredIdx(globalIdx)
  }
  const onHoverOut = () => setHoveredIdx(null)

  const hovered = hoveredIdx !== null ? allNodes[hoveredIdx] : null
  const highlightEdges = useMemo<LineSeg[]>(() => {
    if (hoveredIdx === null) return []
    const nbrs = neighborsByIdx.get(hoveredIdx)
    if (!nbrs || nbrs.size === 0) return []
    const src = allNodes[hoveredIdx]
    const white = new THREE.Color('#ffffff')
    return Array.from(nbrs).map((j) => ({ a: src.pos, b: allNodes[j].pos, color: white }))
  }, [hoveredIdx, neighborsByIdx, allNodes])

  const initialZoom = useMemo(() => {
    if (allNodes.length === 0) return 40
    // Orthographic zoom = pixels per world unit. Fit WORLD_W into ~1100px.
    return 48
  }, [allNodes.length])

  if (!graph || allNodes.length === 0) {
    return <EmptyState message="No graph data — run `gortex index .` to populate." />
  }

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: initialZoom, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={onHoverOut}
    >
      <RaycastThreshold threshold={PICK_THRESHOLD} />

      <LineSegs segments={edges} opacity={0.25} />
      {highlightEdges.length > 0 && (
        <LineSegs segments={highlightEdges} opacity={0.9} />
      )}

      <PointsCloud
        nodes={coolNodes}
        sizes={(i) => sizeForDegree(coolNodes[i].degree)}
        sizeAttenuation={false}
        onClick={pick(coolNodes)}
      />
      <PointsCloud
        nodes={hotNodes}
        sizes={(i) => sizeForDegree(hotNodes[i].degree)}
        sizeAttenuation={false}
        onClick={pick(hotNodes)}
        forceColor={HOT_COLOR}
      />

      {/* Invisible hover probes: two points meshes reused from the visible
          ones but with a larger pick radius by setting raycast threshold.
          We instead re-attach pointer handlers to the same clouds — here
          we render transparent duplicates for dedicated hover events. */}
      <HoverLayer nodes={coolNodes} onHover={onHover(coolNodes)} onOut={onHoverOut} />
      <HoverLayer nodes={hotNodes}  onHover={onHover(hotNodes)}  onOut={onHoverOut} />

      {hovered && (
        <>
          <mesh position={hovered.pos}>
            <ringGeometry args={[HOVER_RING_WORLD * 0.9, HOVER_RING_WORLD * 1.15, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
          <Html
            position={[hovered.pos.x, hovered.pos.y + HOVER_RING_WORLD * 1.6, 0]}
            center
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'var(--bg-1)', color: 'var(--fg-1)',
              border: `1px solid ${cssColor(hovered.color)}`,
              borderRadius: 4, padding: '3px 8px',
              font: '11px JetBrains Mono, ui-monospace, monospace',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              <div>{hovered.node.name}</div>
              <div style={{ color: 'var(--fg-3)', fontSize: 9.5, marginTop: 1 }}>
                {hovered.node.kind} · {hovered.repo} · deg {hovered.degree}
              </div>
            </div>
          </Html>
        </>
      )}

      <TopLabels
        items={topLabels.map((n) => ({
          id: n.id,
          name: n.node.name,
          pos: new THREE.Vector3(n.pos.x, n.pos.y + sizeForDegreeWorld(n.degree), 0),
        }))}
      />

      <OrbitControls
        makeDefault
        enableRotate={false}
        enablePan
        enableZoom
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        zoomSpeed={1.1}
        panSpeed={1.2}
      />
    </Canvas>
  )
}

function HoverLayer({
  nodes, onHover, onOut,
}: {
  nodes: CNode[]
  onHover: (e: ThreeEvent<PointerEvent>) => void
  onOut: () => void
}) {
  // Re-emits pointer events from a transparent points mesh co-located with
  // the visible cloud. Separate from PointsCloud so click handlers on
  // visible clouds stay focused on selection.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    if (nodes.length === 0) return g
    const positions = new Float32Array(nodes.length * 3)
    nodes.forEach((n, i) => {
      positions[i * 3] = n.pos.x
      positions[i * 3 + 1] = n.pos.y
      positions[i * 3 + 2] = n.pos.z
    })
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [nodes])

  if (nodes.length === 0) return null
  return (
    <points onPointerMove={onHover} onPointerOut={onOut}>
      <primitive object={geom} attach="geometry" />
      <pointsMaterial size={0.2} sizeAttenuation transparent opacity={0} depthWrite={false} />
    </points>
  )
}

function cssColor(c: THREE.Color): string {
  return `#${c.getHexString()}`
}

function sizeForDegree(deg: number): number {
  return POINT_PX_BASE + POINT_PX_K * Math.log2(deg + 1)
}

// Approximate vertical offset in world units so labels sit just above the
// hub's visible radius instead of overlapping the dot.
function sizeForDegreeWorld(deg: number): number {
  return 0.06 + 0.025 * Math.log2(deg + 1)
}
