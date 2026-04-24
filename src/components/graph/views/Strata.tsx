'use client'

import { useMemo } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useInspector } from '@/lib/inspector'
import type { GraphData, GortexNode } from '@/lib/types'
import type { Repo } from '@/lib/schema'
import { computeDegree, groupByRepo, stableSortByDegreeDesc, seededRng } from './layout'
import {
  EmptyState, LineSegs, PointsCloud, RaycastThreshold, TopLabels,
  hashStr, normalizeCssColor, type LineSeg,
} from './three-common'

const MAX_PLANES = 8
const MAX_PER_PLANE = 60
const MAX_CROSS_EDGES = 400

const PLANE_X = 12
const PLANE_Z = 6
const PLANE_SEP = 2.6
const NODE_LIFT = 0.06
// World-space point size = BASE + K·log2(deg+1), attenuated by camera.
const POINT_SIZE_BASE = 0.07
const POINT_SIZE_K = 0.03
const HOT_COLOR = '#f7768e'
const ACCENT_COLOR = '#9ece6a'
const PICK_THRESHOLD = 0.1
const TOP_LABEL_COUNT = 24

type SNode = {
  pos: THREE.Vector3
  color: THREE.Color
  repo: string
  hot: boolean
  degree: number
  id: string
  node: GortexNode
}

type PlaneLayout = { rep: Repo; y: number; color: string }

export function ThreeDStrata({
  graph, repos, filterRepos, filterKinds,
}: {
  graph: GraphData | null
  repos: Repo[]
  filterRepos: Set<string>
  filterKinds: Set<string>
}) {
  const setSym = useInspector((s) => s.setSym)

  const { planes, coolNodes, hotNodes, hotEdges, coldEdges, topLabels } = useMemo(() => {
    const empty = {
      planes: [] as PlaneLayout[],
      coolNodes: [] as SNode[],
      hotNodes: [] as SNode[],
      hotEdges: [] as LineSeg[],
      coldEdges: [] as LineSeg[],
      topLabels: [] as SNode[],
    }
    if (!graph) return empty
    const degree = computeDegree(graph.nodes, graph.edges)
    const buckets = groupByRepo(graph.nodes)
    const visible = repos
      .filter((r) => !filterRepos.size || filterRepos.has(r.id))
      .filter((r) => (buckets.get(r.id)?.length ?? 0) > 0)
      .slice(0, MAX_PLANES)

    const half = (visible.length - 1) / 2
    const planes: PlaneLayout[] = visible.map((rep, i) => ({
      rep,
      y: (half - i) * PLANE_SEP,
      color: normalizeCssColor(rep.color),
    }))

    const coolNodes: SNode[] = []
    const hotNodes: SNode[] = []
    const index = new Map<string, SNode>()

    planes.forEach(({ rep, y, color }) => {
      const rng = seededRng(hashStr(rep.id) + 31)
      const bucket = (buckets.get(rep.id) ?? []).filter(
        (n) => !filterKinds.size || filterKinds.has(n.kind),
      )
      const sorted = stableSortByDegreeDesc(bucket, degree).slice(0, MAX_PER_PLANE)
      const maxDeg = Math.max(1, ...sorted.map((n) => degree.get(n.id) ?? 0))
      const col = new THREE.Color(color)
      for (const n of sorted) {
        const nx = (rng() - 0.5) * (PLANE_X - 0.8)
        const nz = (rng() - 0.5) * (PLANE_Z - 0.6)
        const deg = degree.get(n.id) ?? 0
        const hot = deg >= Math.max(6, maxDeg * 0.6)
        const sn: SNode = {
          pos: new THREE.Vector3(nx, y + NODE_LIFT, nz),
          color: col.clone(),
          repo: rep.id,
          hot,
          degree: deg,
          id: n.id,
          node: n,
        }
        ;(hot ? hotNodes : coolNodes).push(sn)
        index.set(n.id, sn)
      }
    })

    const pink = new THREE.Color(HOT_COLOR)
    const accent = new THREE.Color(ACCENT_COLOR)
    const hotEdges: LineSeg[] = []
    const coldEdges: LineSeg[] = []
    for (const e of graph.edges) {
      if (!e.cross_repo) continue
      const a = index.get(e.from)
      const b = index.get(e.to)
      if (!a || !b || a.repo === b.repo) continue
      const seg: LineSeg = {
        a: a.pos, b: b.pos,
        color: e.kind === 'calls' ? pink : accent,
      }
      ;(e.kind === 'calls' ? hotEdges : coldEdges).push(seg)
      if (hotEdges.length + coldEdges.length >= MAX_CROSS_EDGES) break
    }
    const topLabels = [...coolNodes, ...hotNodes]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, TOP_LABEL_COUNT)
    return { planes, coolNodes, hotNodes, hotEdges, coldEdges, topLabels }
  }, [graph, repos, filterRepos, filterKinds])

  const planeEdgesGeom = useMemo(() => new THREE.EdgesGeometry(
    new THREE.PlaneGeometry(PLANE_X, PLANE_Z).rotateX(-Math.PI / 2),
  ), [])

  const pick = (list: SNode[]) => (e: ThreeEvent<MouseEvent>) => {
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

  if (!graph || planes.length === 0) {
    return <EmptyState message="No graph data — run `gortex index .` to populate." />
  }

  return (
    <Canvas
      camera={{ position: [11, 3, 14], fov: 55 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <RaycastThreshold threshold={PICK_THRESHOLD} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 10, 8]} intensity={0.4} />

      {planes.map(({ rep, y, color }) => (
        <group key={rep.id}>
          <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PLANE_X, PLANE_Z]} />
            <meshBasicMaterial
              color={color} transparent opacity={0.07}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments position={[0, y, 0]}>
            <primitive object={planeEdgesGeom} attach="geometry" />
            <lineBasicMaterial color={color} transparent opacity={0.5} />
          </lineSegments>
        </group>
      ))}

      <LineSegs segments={coldEdges} opacity={0.28} />
      <LineSegs segments={hotEdges} opacity={0.85} />

      <PointsCloud
        nodes={coolNodes}
        sizes={(i) => sizeForDegree(coolNodes[i].degree)}
        onClick={pick(coolNodes)}
      />
      <PointsCloud
        nodes={hotNodes}
        sizes={(i) => sizeForDegree(hotNodes[i].degree)}
        onClick={pick(hotNodes)}
        forceColor={HOT_COLOR}
      />

      {planes.map(({ rep, y, color }) => (
        <Html
          key={rep.id}
          position={[PLANE_X / 2 + 0.4, y, -PLANE_Z / 2 + 0.1]}
          center={false}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display: 'inline-flex', flexDirection: 'column', gap: 1,
            background: 'var(--bg-1)', color: 'var(--fg-1)',
            border: `1px solid ${color}66`, borderRadius: 4,
            padding: '3px 8px',
            font: '10px JetBrains Mono, ui-monospace, monospace',
            whiteSpace: 'nowrap', opacity: 0.92,
            transform: 'translate(0, -50%)',
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, background: color, borderRadius: '50%',
              }} />
              {rep.id}
            </div>
            <div style={{ color: 'var(--fg-3)', fontSize: 9 }}>
              {rep.nodes} · {rep.lang}
            </div>
          </div>
        </Html>
      ))}

      <TopLabels
        items={topLabels.map((n) => ({
          id: n.id,
          name: n.node.name,
          pos: new THREE.Vector3(n.pos.x, n.pos.y + 0.1 + sizeForDegree(n.degree), n.pos.z),
        }))}
      />

      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  )
}

function sizeForDegree(deg: number): number {
  return POINT_SIZE_BASE + POINT_SIZE_K * Math.log2(deg + 1)
}
