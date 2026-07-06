import * as THREE from 'three'
import { makePlankTexture, makeSailTexture } from './textures.js'

// The longship is built entirely from primitives — no model files.
// Ship-local axes: bow points toward +z, +y up, +x is port (left).

const HULL_LENGTH = 7.4
const HALF_LEN = HULL_LENGTH / 2

// Half beam of the hull at station u (-1 stern .. +1 bow).
export function hullHalfWidth(u) {
  return 1.15 * Math.pow(Math.max(0.001, 1 - Math.pow(Math.abs(u), 2.4)), 0.55)
}

// Height of the gunwale (top rail) at station u, in ship-local y.
export function gunwaleY(u) {
  return 0.775 + 1.15 * Math.pow(Math.abs(u), 2.5)
}

function buildHullGeometry() {
  const geo = new THREE.BoxGeometry(2.3, 1.35, HULL_LENGTH, 2, 3, 14)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i)
    let y = pos.getY(i)
    const z = pos.getZ(i)
    const u = z / HALF_LEN
    const taper = Math.pow(Math.max(0.001, 1 - Math.pow(Math.abs(u), 2.4)), 0.55)
    x *= taper
    if (y < 0) y *= 0.55 + 0.45 * taper // shallow draft at bow/stern
    y += Math.pow(Math.abs(u), 2.5) * 1.15 // viking sheer: ends sweep up
    pos.setXY(i, x, y)
    pos.setZ(i, z)
  }
  geo.translate(0, 0.1, 0)
  geo.computeVertexNormals()
  return geo
}

function tubeFromPoints(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  const geo = new THREE.TubeGeometry(curve, 20, radius, 7, false)
  return new THREE.Mesh(geo, material)
}

function buildDragonHead(woodDark, gold) {
  const head = new THREE.Group()
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.52), woodDark)
  head.add(skull)

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.46), woodDark)
  snout.position.set(0, -0.05, 0.4)
  head.add(snout)

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.4), woodDark)
  jaw.position.set(0, -0.21, 0.34)
  jaw.rotation.x = 0.28 // open mouth
  head.add(jaw)

  const maw = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.09, 0.3),
    new THREE.MeshStandardMaterial({ color: '#8c2f22', roughness: 1 })
  )
  maw.position.set(0, -0.14, 0.38)
  head.add(maw)

  const hornGeo = new THREE.ConeGeometry(0.055, 0.34, 6)
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo, gold)
    horn.position.set(side * 0.12, 0.22, -0.12)
    horn.rotation.set(-0.7, 0, side * -0.45)
    head.add(horn)

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshStandardMaterial({
        color: '#ffcf4a',
        emissive: '#c58a12',
        emissiveIntensity: 0.7,
      })
    )
    eye.position.set(side * 0.16, 0.05, 0.18)
    head.add(eye)
  }
  return head
}

export function buildShipModel() {
  const group = new THREE.Group()
  const parts = {}

  const plankTex = makePlankTexture()
  const wood = new THREE.MeshStandardMaterial({
    map: plankTex,
    color: '#9c6b3c',
    roughness: 0.95,
    flatShading: true,
  })
  const woodDark = new THREE.MeshStandardMaterial({
    color: '#5d3d22',
    roughness: 0.95,
    flatShading: true,
  })
  const gold = new THREE.MeshStandardMaterial({
    color: '#d9a441',
    roughness: 0.45,
    metalness: 0.5,
    flatShading: true,
  })

  // --- hull ---
  const hull = new THREE.Mesh(buildHullGeometry(), wood)
  hull.castShadow = true
  group.add(hull)

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 5.4), woodDark)
  deck.position.y = 0.42
  group.add(deck)

  // keel line
  const keel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 6.6), woodDark)
  keel.position.y = -0.62
  group.add(keel)

  // --- stem & stern posts (swan necks) ---
  const stem = tubeFromPoints(
    [
      [0, 0.7, 3.2],
      [0, 1.5, 3.7],
      [0, 2.35, 3.62],
      [0, 2.85, 3.25],
    ],
    0.12,
    woodDark
  )
  stem.castShadow = true
  group.add(stem)

  const stern = tubeFromPoints(
    [
      [0, 0.7, -3.2],
      [0, 1.55, -3.72],
      [0, 2.4, -3.6],
      [0, 2.75, -3.15],
    ],
    0.11,
    woodDark
  )
  stern.castShadow = true
  group.add(stern)

  // curled tail tip on the stern post
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 6), gold)
  tail.position.set(0, 2.92, -3.05)
  tail.rotation.x = -0.9
  group.add(tail)

  const dragonHead = buildDragonHead(woodDark, gold)
  dragonHead.position.set(0, 3.05, 3.32)
  dragonHead.rotation.x = 0.12
  dragonHead.scale.setScalar(1.4)
  dragonHead.castShadow = true
  group.add(dragonHead)

  // --- mast, yard, sail ---
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.5, 8), woodDark)
  mast.position.set(0, 2.65, 0.2)
  mast.castShadow = true
  group.add(mast)

  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.7, 8), woodDark)
  yard.rotation.z = Math.PI / 2
  yard.position.set(0, 4.55, 0.2)
  group.add(yard)

  const sailGeo = new THREE.PlaneGeometry(3.3, 2.7, 12, 8)
  {
    const pos = sailGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const across = Math.cos((x / 3.3) * Math.PI) // 1 mid, 0 edges
      const down = 0.35 + 0.65 * (0.5 - y / 2.7) // fuller near the foot
      pos.setZ(i, 0.7 * across * down)
    }
    sailGeo.computeVertexNormals()
  }
  const sail = new THREE.Mesh(
    sailGeo,
    new THREE.MeshStandardMaterial({
      map: makeSailTexture(),
      side: THREE.DoubleSide,
      roughness: 1,
    })
  )
  sail.position.set(0, 3.15, 0.24)
  sail.castShadow = true
  group.add(sail)
  parts.sail = sail

  // pennant at masthead
  const flagShape = new THREE.Shape()
  flagShape.moveTo(0, 0)
  flagShape.lineTo(0.85, 0.14)
  flagShape.lineTo(0, 0.28)
  const flag = new THREE.Mesh(
    new THREE.ShapeGeometry(flagShape),
    new THREE.MeshStandardMaterial({ color: '#c8452f', side: THREE.DoubleSide, roughness: 1 })
  )
  flag.rotation.y = Math.PI / 2
  flag.position.set(0, 4.92, 0.2)
  group.add(flag)
  parts.flag = flag

  // rigging
  {
    const pts = []
    const yardEndL = [1.8, 4.55, 0.2]
    const yardEndR = [-1.8, 4.55, 0.2]
    const bowDeck = [0, 1.0, 3.1]
    const sternDeck = [0, 1.0, -3.1]
    for (const end of [yardEndL, yardEndR]) {
      pts.push(...end, ...bowDeck, ...end, ...sternDeck)
    }
    pts.push(0, 4.85, 0.2, 0, 2.6, 3.5) // forestay
    pts.push(0, 4.85, 0.2, 0, 2.5, -3.45) // backstay
    const rigGeo = new THREE.BufferGeometry()
    rigGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    const rig = new THREE.LineSegments(
      rigGeo,
      new THREE.LineBasicMaterial({ color: '#2e2016', transparent: true, opacity: 0.85 })
    )
    group.add(rig)
  }

  // --- shields along the gunwale ---
  const shieldColors = ['#a93f35', '#e6d7b4', '#2f6f7e', '#d9a441']
  const shieldGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14)
  shieldGeo.rotateZ(Math.PI / 2)
  const rimGeo = new THREE.TorusGeometry(0.42, 0.028, 6, 18)
  rimGeo.rotateY(Math.PI / 2)
  const bossGeo = new THREE.SphereGeometry(0.09, 8, 8)
  const iron = new THREE.MeshStandardMaterial({ color: '#4d5257', roughness: 0.6, metalness: 0.6 })

  let shieldIndex = 0
  for (let zi = -2.3; zi <= 2.31; zi += 0.92) {
    const u = zi / HALF_LEN
    const hw = hullHalfWidth(u)
    const gy = gunwaleY(u) + 0.12
    for (const side of [-1, 1]) {
      const mat = new THREE.MeshStandardMaterial({
        color: shieldColors[shieldIndex % shieldColors.length],
        roughness: 0.85,
        flatShading: true,
      })
      const shield = new THREE.Mesh(shieldGeo, mat)
      shield.position.set(side * (hw + 0.02), gy, zi)
      shield.castShadow = true
      const rim = new THREE.Mesh(rimGeo, woodDark)
      rim.position.copy(shield.position)
      const boss = new THREE.Mesh(bossGeo, iron)
      boss.position.set(side * (hw + 0.09), gy, zi)
      group.add(shield, rim, boss)
      shieldIndex++
    }
    shieldIndex++ // offset colors between stations
  }

  // --- oars ---
  parts.oarsLeft = []
  parts.oarsRight = []
  const oarShaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.7, 6)
  oarShaftGeo.rotateZ(Math.PI / 2) // along +x
  oarShaftGeo.translate(1.35, 0, 0)
  const bladeGeo = new THREE.BoxGeometry(0.6, 0.16, 0.045)
  bladeGeo.translate(2.55, 0, 0)

  for (const zi of [-1.85, -0.95, -0.05, 0.85, 1.75]) {
    const u = zi / HALF_LEN
    const hw = hullHalfWidth(u)
    const gy = gunwaleY(u) - 0.15
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group()
      pivot.position.set(side * (hw - 0.05), gy, zi)
      const oar = new THREE.Group()
      oar.add(new THREE.Mesh(oarShaftGeo, woodDark))
      oar.add(new THREE.Mesh(bladeGeo, woodDark))
      if (side === -1) oar.rotation.y = Math.PI // mirror to -x
      pivot.add(oar)
      group.add(pivot)
      if (side === 1) parts.oarsLeft.push(pivot)
      else parts.oarsRight.push(pivot)
    }
  }

  // --- steering oar (side rudder, on the starboard quarter like a real drakkar) ---
  const rudder = new THREE.Group()
  rudder.position.set(-0.8, 0.9, -2.5)
  const rShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.9, 6), woodDark)
  rShaft.position.y = -0.55
  const rBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.34), woodDark)
  rBlade.position.y = -1.35
  rudder.add(rShaft, rBlade)
  rudder.rotation.z = 0.18
  group.add(rudder)
  parts.rudder = rudder

  return { group, parts }
}
