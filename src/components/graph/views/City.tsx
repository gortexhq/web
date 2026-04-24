'use client'

import { useMemo, useLayoutEffect, useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useInspector } from '@/lib/inspector'
import type { GraphData, GortexNode } from '@/lib/types'
import type { Repo } from '@/lib/schema'
import { computeDegree, groupByRepo, stableSortByDegreeDesc } from './layout'
import {
  EmptyState, LineSegs, TopLabels, normalizeCssColor, type LineSeg,
} from './three-common'

const MAX_REPOS = 12
const BLD_COLS = 6
const BLD_ROWS = 5
const BLD_CAP = BLD_COLS * BLD_ROWS
const DISTRICT_W = 5
const DISTRICT_D = 5
const DISTRICT_GAP = 1.2
const DISTRICTS_PER_ROW = 4
const BASE_HEIGHT = 0.35
const MAX_HEIGHT = 3.0
const FOOTPRINT_FILL = 0.7
const HOT_COLOR = '#f7768e'
const MAX_SKYBRIDGES = 80
const TOP_LABEL_COUNT = 20

type Building = {
  pos: THREE.Vector3       // centre of the base
  top: THREE.Vector3       // centre of the top (used for skybridges)
  size: THREE.Vector3      // (width, height, depth)
  color: THREE.Color
  hot: boolean
  degree: number
  repo: string
  node: GortexNode
}

type District = {
  rep: Repo
  color: string
  cx: number
  cz: number
}

export function ThreeDCity({
  graph, repos, filterRepos, filterKinds,
}: {
  graph: GraphData | null
  repos: Repo[]
  filterRepos: Set<string>
  filterKinds: Set<string>
}) {
  const setSym = useInspector((s) => s.setSym)

  const { districts, buildings, skybridges, topLabels } = useMemo(() => {
    const empty = {
      districts: [] as District[],
      buildings: [] as Building[],
      skybridges: [] as LineSeg[],
      topLabels: [] as Building[],
    }
    if (!graph) return empty
    const degree = computeDegree(graph.nodes, graph.edges)
    const buckets = groupByRepo(graph.nodes)
    const visible = repos
      .filter((r) => !filterRepos.size || filterRepos.has(r.id))
      .filter((r) => (buckets.get(r.id)?.length ?? 0) > 0)
      .slice(0, MAX_REPOS)

    const rowCount = Math.ceil(visible.length / DISTRICTS_PER_ROW)
    const totalW = DISTRICTS_PER_ROW * (DISTRICT_W + DISTRICT_GAP) - DISTRICT_GAP
    const totalD = rowCount * (DISTRICT_D + DISTRICT_GAP) - DISTRICT_GAP
    const offsetX = -totalW / 2 + DISTRICT_W / 2
    const offsetZ = -totalD / 2 + DISTRICT_D / 2

    const districts: District[] = visible.map((rep, idx) => {
      const col = idx % DISTRICTS_PER_ROW
      const row = Math.floor(idx / DISTRICTS_PER_ROW)
      return {
        rep,
        color: normalizeCssColor(rep.color),
        cx: offsetX + col * (DISTRICT_W + DISTRICT_GAP),
        cz: offsetZ + row * (DISTRICT_D + DISTRICT_GAP),
      }
    })

    const buildings: Building[] = []
    const nodeBld = new Map<string, Building>()
    const cellW = DISTRICT_W / BLD_COLS
    const cellD = DISTRICT_D / BLD_ROWS
    const fpW = cellW * FOOTPRINT_FILL
    const fpD = cellD * FOOTPRINT_FILL

    districts.forEach(({ rep, cx, cz, color }) => {
      const bucket = (buckets.get(rep.id) ?? []).filter(
        (n) => !filterKinds.size || filterKinds.has(n.kind),
      )
      const sorted = stableSortByDegreeDesc(bucket, degree).slice(0, BLD_CAP)
      const maxDeg = Math.max(1, ...sorted.map((n) => degree.get(n.id) ?? 0))
      const repoColor = new THREE.Color(color)
      sorted.forEach((n, k) => {
        const i = k % BLD_COLS
        const j = Math.floor(k / BLD_COLS)
        const bx = cx - DISTRICT_W / 2 + (i + 0.5) * cellW
        const bz = cz - DISTRICT_D / 2 + (j + 0.5) * cellD
        const deg = degree.get(n.id) ?? 0
        const norm = deg / maxDeg
        const h = BASE_HEIGHT + norm * (MAX_HEIGHT - BASE_HEIGHT)
        const hot = deg >= Math.max(8, maxDeg * 0.6)
        const b: Building = {
          pos: new THREE.Vector3(bx, h / 2, bz),
          top: new THREE.Vector3(bx, h + 0.02, bz),
          size: new THREE.Vector3(fpW, h, fpD),
          color: repoColor.clone(),
          hot,
          degree: deg,
          repo: rep.id,
          node: n,
        }
        buildings.push(b)
        nodeBld.set(n.id, b)
      })
    })

    const pink = new THREE.Color(HOT_COLOR)
    const skybridges: LineSeg[] = []
    for (const e of graph.edges) {
      if (!e.cross_repo || e.kind !== 'calls') continue
      const a = nodeBld.get(e.from)
      const b = nodeBld.get(e.to)
      if (!a || !b || a.repo === b.repo) continue
      skybridges.push({ a: a.top, b: b.top, color: pink })
      if (skybridges.length >= MAX_SKYBRIDGES) break
    }

    const topLabels = [...buildings]
      .sort((a, b) => b.degree - a.degree)
      .slice(0, TOP_LABEL_COUNT)
    return { districts, buildings, skybridges, topLabels }
  }, [graph, repos, filterRepos, filterKinds])

  if (!graph || districts.length === 0) {
    return <EmptyState message="No graph data — run `gortex index .` to populate." />
  }

  const onBuildingClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const i = e.instanceId
    if (i === undefined) return
    const b = buildings[i]
    if (!b) return
    setSym({
      id: b.node.id,
      kind: (b.node.kind as 'function') ?? 'function',
      name: b.node.name,
      repo: b.repo,
      file: b.node.file_path,
      sig: '', callers: 0, callees: 0, community: '', caveats: [],
    })
  }

  return (
    <Canvas
      camera={{ position: [14, 10, 14], fov: 50 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 14, 8]} intensity={0.9} />
      <directionalLight position={[-8, 6, -4]} intensity={0.25} />

      {/* ground */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0f1116" roughness={1} />
      </mesh>

      {/* district tiles */}
      {districts.map((d) => (
        <group key={d.rep.id} position={[d.cx, 0, d.cz]}>
          <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[DISTRICT_W, DISTRICT_D]} />
            <meshBasicMaterial color={d.color} transparent opacity={0.08} depthWrite={false} />
          </mesh>
        </group>
      ))}

      <BuildingInstances buildings={buildings} onClick={onBuildingClick} />

      <LineSegs segments={skybridges} opacity={0.75} />

      {/* district labels */}
      {districts.map((d) => (
        <Html
          key={d.rep.id}
          position={[d.cx - DISTRICT_W / 2, 0.05, d.cz - DISTRICT_D / 2 - 0.15]}
          center={false}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-1)', color: 'var(--fg-1)',
            border: `1px solid ${d.color}66`, borderRadius: 4,
            padding: '2px 8px',
            font: '10px JetBrains Mono, ui-monospace, monospace',
            whiteSpace: 'nowrap', opacity: 0.92,
          }}>
            <span style={{
              width: 6, height: 6, background: d.color, borderRadius: '50%',
            }} />
            {d.rep.id}
          </div>
        </Html>
      ))}

      <TopLabels
        items={topLabels.map((b) => ({
          id: b.node.id,
          name: b.node.name,
          pos: new THREE.Vector3(b.top.x, b.top.y + 0.18, b.top.z),
        }))}
      />

      <OrbitControls enablePan enableZoom enableRotate makeDefault target={[0, 1, 0]} />
    </Canvas>
  )
}

function BuildingInstances({
  buildings, onClick,
}: {
  buildings: Building[]
  onClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pink = useMemo(() => new THREE.Color(HOT_COLOR), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || buildings.length === 0) return
    const dummy = new THREE.Object3D()
    buildings.forEach((b, i) => {
      dummy.position.copy(b.pos)
      dummy.scale.copy(b.size)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.hot ? pink : b.color)
    })
    mesh.count = buildings.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [buildings, pink])

  if (buildings.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, buildings.length]}
      onClick={onClick}
      castShadow={false}
      receiveShadow={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={0.6}
        metalness={0.05}
        transparent
        opacity={0.92}
      />
    </instancedMesh>
  )
}
