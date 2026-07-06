import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import fontData from './assets/helvetiker_bold.typeface.json'
import { makePlankTexture, makeBarrelTexture, makeRuneTexture } from './textures.js'

const font = new FontLoader().parse(fontData)

const mat = {
  sand: new THREE.MeshStandardMaterial({ color: '#d8c08a', roughness: 1, flatShading: true }),
  grass: new THREE.MeshStandardMaterial({ color: '#5d8f4a', roughness: 1, flatShading: true }),
  pine: new THREE.MeshStandardMaterial({ color: '#2f6b45', roughness: 1, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 1, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: '#7d8388', roughness: 1, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: '#8a8f94', roughness: 1, flatShading: true }),
  gold: new THREE.MeshStandardMaterial({ color: '#e0a83b', roughness: 0.45, metalness: 0.35 }),
  ice: new THREE.MeshStandardMaterial({ color: '#e9f5f8', roughness: 0.55, flatShading: true }),
  serpent: new THREE.MeshStandardMaterial({ color: '#2e8b6e', roughness: 0.8, flatShading: true }),
  serpentBelly: new THREE.MeshStandardMaterial({ color: '#bde3c8', roughness: 0.9, flatShading: true }),
  cloud: new THREE.MeshStandardMaterial({ color: '#f4fbfd', roughness: 1, flatShading: true }),
}

export class World {
  constructor(scene, physics, ui) {
    this.scene = scene
    this.physics = physics
    this.ui = ui
    this.time = 0
    this.triggers = []
    this.floatingLabels = []
    this.clouds = []

    this.wood = new THREE.MeshStandardMaterial({
      map: makePlankTexture('#b0854c', '#7a5326'),
      roughness: 0.95,
    })

    this.buildTitleLetters()
    this.buildCrates()
    this.buildBarrels()
    this.buildIslands()
    this.buildRampAndSerpent()
    this.buildRocks()
    this.buildIcebergs()
    this.buildClouds()
  }

  // ------------------------------------------------------------------ text
  makeLetterMeshes(text, size) {
    const meshes = []
    let cursor = 0
    for (const char of text) {
      if (char === ' ') {
        cursor += size * 0.6
        continue
      }
      const geo = new TextGeometry(char, {
        font,
        size,
        depth: size * 0.28,
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: size * 0.02,
        bevelSize: size * 0.015,
        bevelSegments: 2,
      })
      geo.computeBoundingBox()
      const bb = geo.boundingBox
      const width = bb.max.x - bb.min.x
      geo.center()
      const mesh = new THREE.Mesh(geo, mat.gold)
      mesh.castShadow = true
      meshes.push({
        mesh,
        half: [
          Math.max(width / 2, 0.2),
          (bb.max.y - bb.min.y) / 2,
          Math.max((bb.max.z - bb.min.z) / 2, 0.25),
        ],
        offsetX: cursor + width / 2,
      })
      cursor += width + size * 0.22
    }
    const total = cursor - size * 0.22
    for (const m of meshes) m.offsetX -= total / 2
    return meshes
  }

  // The site title is spelled out in knockable, physics-driven gold letters.
  buildTitleLetters() {
    const rows = [
      { text: 'VIKING', z: 21, size: 2.4 },
      { text: 'SHIP', z: 27, size: 2.4 },
    ]
    for (const row of rows) {
      for (const letter of this.makeLetterMeshes(row.text, row.size)) {
        this.scene.add(letter.mesh)
        const body = this.physics.addDynamicBox(
          letter.half,
          [-letter.offsetX, letter.half[1] + 0.05, row.z],
          8,
          letter.mesh,
          { bob: 0.5 }
        )
        // face the spawn point
        body.quaternion.setFromEuler(0, Math.PI, 0)
      }
    }
  }

  // ----------------------------------------------------------------- props
  buildCrates() {
    const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95)
    const stack = [
      [-0.55, 0, 0],
      [0.55, 0, 0],
      [1.65, 0, 0],
      [0, 1, 0.02],
      [1.1, 1, -0.02],
      [0.55, 2, 0],
    ]
    for (const [dx, row, dz] of stack) {
      const mesh = new THREE.Mesh(geo, this.wood)
      mesh.castShadow = true
      this.scene.add(mesh)
      this.physics.addDynamicBox(
        [0.475, 0.475, 0.475],
        [13 + dx, 0.48 + row * 0.96, 33 + dz],
        5,
        mesh,
        { bob: 0.4 }
      )
    }
  }

  buildBarrels() {
    const geo = new THREE.CylinderGeometry(0.48, 0.48, 1.15, 12)
    const material = new THREE.MeshStandardMaterial({ map: makeBarrelTexture(), roughness: 0.9 })
    const spots = [
      [-9, 24, 0],
      [-11, 27, 1],
      [7, 40, 0],
      [-16, 44, 0],
      [22, 24, 1],
      [3, 47, 0],
      [-26, 12, 0],
      [18, 50, 1],
    ]
    for (const [x, z, tipped] of spots) {
      const mesh = new THREE.Mesh(geo, material)
      mesh.castShadow = true
      this.scene.add(mesh)
      const body = this.physics.addDynamicCylinder(
        0.48,
        1.15,
        [x, tipped ? 0.5 : 0.6, z],
        4,
        mesh,
        { bob: 0.55 }
      )
      if (tipped) body.quaternion.setFromEuler(Math.PI / 2, 0, Math.PI / 3)
    }
  }

  // --------------------------------------------------------------- islands
  buildIslands() {
    this.makeIsland(-42, 46, 9, 'projects', 'PROJECTS')
    this.makeIsland(44, 64, 8, 'about', 'ABOUT')
    this.makeIsland(-20, -56, 7.5, 'contact', 'CONTACT')
  }

  makeIsland(x, z, r, key, label) {
    const island = new THREE.Group()
    island.position.set(x, 0, z)

    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, 2.8, 9, 1), mat.sand)
    base.position.y = 0.75
    base.receiveShadow = true
    island.add(base)

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.58, 0.8, 9), mat.grass)
    cap.position.y = 2.5
    cap.receiveShadow = true
    island.add(cap)

    // pines
    const treeSpots = [
      [r * 0.22, r * 0.1],
      [-r * 0.2, r * 0.18],
      [0.05 * r, -r * 0.24],
    ]
    for (const [tx, tz] of treeSpots) {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.8, 6), mat.trunk)
      trunk.position.y = 0.4
      const lower = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.3, 7), mat.pine)
      lower.position.y = 1.25
      const upper = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 7), mat.pine)
      upper.position.y = 2.05
      lower.castShadow = upper.castShadow = true
      tree.add(trunk, lower, upper)
      tree.position.set(tx, 2.85, tz)
      island.add(tree)
    }

    // a couple of boulders on the beach
    for (const [bx, bz, s] of [
      [r * 0.7, r * 0.25, 0.5],
      [-r * 0.5, -r * 0.55, 0.38],
    ]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat.rock)
      rock.position.set(bx, 2.0, bz)
      rock.castShadow = true
      island.add(rock)
    }

    // runestone at the shore, facing open water toward the spawn
    const toward = new THREE.Vector3(-x, 0, -z).normalize()
    const stone = this.makeRunestone(label)
    stone.position.set(toward.x * r * 0.62, 2.6, toward.z * r * 0.62)
    stone.lookAt(new THREE.Vector3(0, 2.6, 0).add(island.position))
    island.add(stone)

    this.scene.add(island)
    this.physics.addStaticCylinder(r * 0.82, 6, [x, 1, z])

    // floating label + trigger
    const labelMesh = this.makeFloatingLabel(label)
    labelMesh.position.set(x + toward.x * r * 0.62, 5.4, z + toward.z * r * 0.62)
    this.scene.add(labelMesh)
    this.floatingLabels.push({ mesh: labelMesh, baseY: 5.4, phase: Math.random() * 6 })

    this.triggers.push({
      key,
      x: x + toward.x * (r * 0.62 + 2),
      z: z + toward.z * (r * 0.62 + 2),
      radius: 9.5,
      inside: false,
    })
  }

  makeRunestone(label) {
    const group = new THREE.Group()
    const geo = new THREE.BoxGeometry(1.5, 2.4, 0.5, 2, 3, 1)
    const pos = geo.attributes.position
    // hand-hewn irregularity
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const shrink = y > 1.0 ? 0.75 : 1
      pos.setX(i, pos.getX(i) * shrink + Math.sin(i * 37.7) * 0.05)
      pos.setZ(i, pos.getZ(i) * shrink + Math.cos(i * 21.3) * 0.04)
    }
    geo.computeVertexNormals()
    const stone = new THREE.Mesh(geo, mat.stone)
    stone.castShadow = true
    group.add(stone)

    const runes = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.9),
      new THREE.MeshStandardMaterial({
        map: makeRuneTexture(label.length),
        transparent: true,
        roughness: 1,
      })
    )
    runes.position.set(0, -0.05, 0.29)
    group.add(runes)
    return group
  }

  makeFloatingLabel(text) {
    const geo = new TextGeometry(text, {
      font,
      size: 0.66,
      depth: 0.16,
      curveSegments: 4,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
    })
    geo.center()
    return new THREE.Mesh(geo, mat.gold)
  }

  // --------------------------------------------------- ramp + sea serpent
  // Kept well to the side of the letter rows: smashed letters scatter
  // forward from spawn, and debris parked at the ramp base blocks the climb.
  buildRampAndSerpent() {
    const RAMP_X = -26
    // wooden launch ramp
    const rampGroup = new THREE.Group()
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.5, 9.5), this.wood)
    deck.castShadow = true
    deck.receiveShadow = true
    rampGroup.add(deck)
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 9.5), this.wood)
      rail.position.set(side * 2.8, 0.4, 0)
      rampGroup.add(rail)
    }
    const angle = -0.3
    rampGroup.position.set(RAMP_X, 1.15, 56)
    rampGroup.rotation.x = angle
    this.scene.add(rampGroup)

    const q = new CANNON.Quaternion().setFromEuler(angle, 0, 0)
    this.physics.addStaticBox([2.8, 0.25, 4.75], [RAMP_X, 1.15, 56], q)
    for (const side of [-1, 1]) {
      const railBody = new CANNON.Vec3(side * 2.8, 0.4, 0)
      const railWorld = q.vmult(railBody)
      this.physics.addStaticBox(
        [0.125, 0.25, 4.75],
        [RAMP_X + railWorld.x, 1.15 + railWorld.y, 56 + railWorld.z],
        q
      )
    }
    // support posts (visual only)
    for (const [px, pz] of [
      [RAMP_X - 2.4, 59.5],
      [RAMP_X + 2.4, 59.5],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.4, 7), this.wood)
      post.position.set(px, 1.2, pz)
      this.scene.add(post)
    }

    // Jörmungandr crossing your flight path — humps you jump between
    const humps = [-15, -7.5, 7.5, 15]
    for (const hx of humps) {
      const hump = new THREE.Mesh(
        new THREE.TorusGeometry(2.6, 0.85, 8, 14, Math.PI),
        mat.serpent
      )
      hump.rotation.y = Math.PI / 2
      hump.position.set(RAMP_X + hx, 0.1, 74)
      hump.castShadow = true
      this.scene.add(hump)
      this.physics.addStaticCylinder(1.0, 5, [RAMP_X + hx, 1, 74])
    }
    // head rearing up at the end of the line
    const head = new THREE.Group()
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 4.4, 9), mat.serpent)
    neck.position.y = 2.2
    head.add(neck)
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), mat.serpent)
    skull.position.set(0, 4.6, 0.3)
    skull.scale.set(0.9, 0.8, 1.25)
    head.add(skull)
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 7), mat.serpentBelly)
    snout.rotation.x = Math.PI / 2
    snout.position.set(0, 4.45, 1.4)
    head.add(snout)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        new THREE.MeshStandardMaterial({ color: '#ffd23e', emissive: '#a86e00' })
      )
      eye.position.set(side * 0.5, 4.85, 0.95)
      head.add(eye)
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 5), mat.serpent)
      fin.position.set(side * 0.9, 4.7, -0.3)
      fin.rotation.z = side * -0.9
      head.add(fin)
    }
    head.position.set(RAMP_X + 21.5, 0, 74)
    head.rotation.y = Math.PI // face the ramp
    head.castShadow = true
    this.scene.add(head)
    this.serpentHead = head
    this.physics.addStaticCylinder(1.0, 9, [RAMP_X + 21.5, 2, 74])
  }

  buildRocks() {
    const spots = [
      [14, 68, 1.6],
      [30, 36, 1.2],
      [-34, 8, 1.9],
      [12, -30, 1.4],
      [38, -14, 2.2],
      [60, 20, 1.7],
      [-58, -20, 2.0],
    ]
    for (const [x, z, s] of spots) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat.rock)
      rock.position.set(x, s * 0.45, z)
      rock.rotation.set(x, z, x + z)
      rock.castShadow = true
      this.scene.add(rock)
      this.physics.addStaticCylinder(s * 0.85, s * 2, [x, s * 0.4, z])
    }
  }

  buildIcebergs() {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (i % 3) * 0.17
      const dist = 150 + (i % 5) * 12
      const s = 4 + (i % 4) * 2.5
      const berg = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat.ice)
      berg.position.set(Math.cos(angle) * dist, s * 0.3, Math.sin(angle) * dist)
      berg.rotation.set(i, i * 2.1, 0)
      this.scene.add(berg)
    }
  }

  buildClouds() {
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group()
      const n = 2 + (i % 3)
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + ((i + j) % 3) * 1.6, 0), mat.cloud)
        puff.position.set(j * 4.2 - n * 2, (j % 2) * 1.1, ((j + i) % 3) * 1.5)
        puff.scale.y = 0.55
        cloud.add(puff)
      }
      const angle = (i / 8) * Math.PI * 2
      cloud.position.set(Math.cos(angle) * (60 + i * 9), 30 + (i % 4) * 5, Math.sin(angle) * (60 + i * 9))
      this.scene.add(cloud)
      this.clouds.push(cloud)
    }
  }

  // ---------------------------------------------------------------- update
  update(dt, time, shipPos) {
    this.time = time

    for (const cloud of this.clouds) {
      cloud.position.x += dt * 0.6
      if (cloud.position.x > 160) cloud.position.x = -160
    }

    for (const label of this.floatingLabels) {
      label.mesh.position.y = label.baseY + Math.sin(time * 1.2 + label.phase) * 0.25
      label.mesh.rotation.y = Math.sin(time * 0.4 + label.phase) * 0.35
    }

    if (this.serpentHead) {
      this.serpentHead.position.y = Math.sin(time * 0.7) * 0.4 - 0.2
      this.serpentHead.rotation.z = Math.sin(time * 0.5) * 0.06
    }

    // runestone proximity -> open the matching panel
    for (const trig of this.triggers) {
      const d = Math.hypot(shipPos.x - trig.x, shipPos.z - trig.z)
      if (!trig.inside && d < trig.radius) {
        trig.inside = true
        this.ui.openPanel(trig.key)
      } else if (trig.inside && d > trig.radius + 3.5) {
        trig.inside = false
        this.ui.closePanelIf(trig.key)
      }
    }
  }
}
