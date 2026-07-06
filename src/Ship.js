import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { buildShipModel } from './ShipModel.js'
import { waveHeight, waveSlope } from './Ocean.js'
import { makeRadialTexture } from './textures.js'

const SPAWN = { x: 0, y: 1.6, z: 0 }

// cannon's RaycastVehicle drives along -engineForce on the forward axis,
// so forward motion (+z local) needs a negative force. Verified in sim.
const MAX_FORCE = 1100
const MAX_STEER = 0.6
const BRAKE_FORCE = 22
const TOP_SPEED = 26
const TOP_SPEED_REVERSE = 9

// The physics chassis rides on invisible wheels well above the water plane;
// the visual hull is dropped so it sits *in* the sea like a boat.
const VISUAL_DROP = -0.62

export class Ship {
  constructor(scene, physics) {
    this.scene = scene
    this.physics = physics

    // --- chassis + raycast vehicle (the "car" under the longship) ---
    this.body = new CANNON.Body({ mass: 260, material: physics.materials.object })
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(1.05, 0.5, 3.1)), new CANNON.Vec3(0, 0.1, 0))
    this.body.position.set(SPAWN.x, SPAWN.y, SPAWN.z)
    this.body.angularDamping = 0.12

    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.body,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    })

    const wheelOptions = {
      radius: 0.45,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 45,
      suspensionRestLength: 0.5,
      frictionSlip: 1.6,
      dampingRelaxation: 2.5,
      dampingCompression: 4.5,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      maxSuspensionTravel: 0.5,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    }

    // 0,1 front (bow) — steering; 2,3 rear — drive
    const connections = [
      [0.95, -0.1, 2.15],
      [-0.95, -0.1, 2.15],
      [0.95, -0.1, -2.15],
      [-0.95, -0.1, -2.15],
    ]
    for (const [x, y, z] of connections) {
      wheelOptions.chassisConnectionPointLocal.set(x, y, z)
      this.vehicle.addWheel({ ...wheelOptions })
    }
    this.vehicle.addToWorld(physics.world)

    // --- visuals ---
    this.root = new THREE.Group()
    const built = buildShipModel()
    this.model = built.group
    this.parts = built.parts
    this.visual = new THREE.Group()
    this.visual.position.y = VISUAL_DROP
    this.visual.add(this.model)
    this.root.add(this.visual)
    scene.add(this.root)

    // soft blob shadow on the water
    this.blobShadow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 18),
      new THREE.MeshBasicMaterial({
        map: makeRadialTexture(),
        color: 0x02121c,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      })
    )
    this.blobShadow.rotation.x = -Math.PI / 2
    scene.add(this.blobShadow)

    // --- wake foam pool ---
    this.wake = []
    const wakeGeo = new THREE.CircleGeometry(1, 12)
    wakeGeo.rotateX(-Math.PI / 2)
    const wakeTex = makeRadialTexture()
    for (let i = 0; i < 50; i++) {
      const m = new THREE.Mesh(
        wakeGeo,
        new THREE.MeshBasicMaterial({
          map: wakeTex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      )
      m.visible = false
      scene.add(m)
      this.wake.push({ mesh: m, age: 0, life: 1 })
    }
    this.wakeTimer = 0

    this.oarPhase = 0
    this.groundedSmooth = 1
    this.flippedTime = 0
    this.speed = 0

    this._fwd = new THREE.Vector3()
    this._up = new CANNON.Vec3()
  }

  get forward() {
    this._fwd.set(0, 0, 1).applyQuaternion(this.root.quaternion)
    return this._fwd
  }

  reset(full = true) {
    const b = this.body
    if (full) b.position.set(SPAWN.x, SPAWN.y, SPAWN.z)
    else b.position.y = SPAWN.y + 1
    const yaw = full ? 0 : this.getYaw()
    b.quaternion.setFromEuler(0, yaw, 0)
    b.velocity.setZero()
    b.angularVelocity.setZero()
    this.flippedTime = 0
  }

  getYaw() {
    const f = this.forward
    return Math.atan2(f.x, f.z)
  }

  update(dt, time, controls) {
    const v = this.vehicle
    const b = this.body

    // --- driving forces ---
    const velocity = b.velocity
    this.speed = Math.hypot(velocity.x, velocity.z)
    const fwd = this.forward
    const signedSpeed = velocity.x * fwd.x + velocity.z * fwd.z

    let force = -MAX_FORCE * controls.throttle
    // ease off toward top speed instead of a hard cut
    if (controls.throttle > 0) {
      const k = Math.min(1, Math.max(0, signedSpeed) / TOP_SPEED)
      force *= 1 - k * k * k
    } else if (controls.throttle < 0) {
      const k = Math.min(1, Math.max(0, -signedSpeed) / TOP_SPEED_REVERSE)
      force *= 0.6 * (1 - k * k * k)
    }
    v.applyEngineForce(force * 0.6, 0)
    v.applyEngineForce(force * 0.6, 1)
    v.applyEngineForce(force, 2)
    v.applyEngineForce(force, 3)

    const steer = (MAX_STEER * controls.steer) / (1 + this.speed * 0.04)
    v.setSteeringValue(steer, 0)
    v.setSteeringValue(steer, 1)

    const brake = controls.brake ? BRAKE_FORCE : controls.throttle === 0 ? 1.4 : 0
    for (let i = 0; i < 4; i++) v.setBrake(brake, i)

    // --- flip recovery ---
    b.vectorToWorldFrame(CANNON.Vec3.UNIT_Y, this._up)
    if (this._up.y < 0.15) {
      this.flippedTime += dt
      if (this.flippedTime > 2.5) this.reset(false)
    } else {
      this.flippedTime = 0
    }

    // --- sync visuals ---
    this.root.position.copy(b.position)
    this.root.quaternion.copy(b.quaternion)

    let onGround = 0
    for (const w of v.wheelInfos) if (w.isInContact) onGround++
    const grounded = onGround / 4
    this.groundedSmooth += (grounded - this.groundedSmooth) * Math.min(1, dt * 5)

    // bob + tilt with the (visual) swell while on the water
    const g = this.groundedSmooth
    const wave = waveHeight(b.position.x, b.position.z, time)
    const slope = waveSlope(b.position.x, b.position.z, time)
    this.visual.position.y = VISUAL_DROP + wave * 0.85 * g + 0.06 * Math.sin(time * 1.7) * g
    this.visual.rotation.x = slope.sz * 0.5 * g
    this.visual.rotation.z = -slope.sx * 0.6 * g + controls.steer * -0.06 * Math.min(1, this.speed / 8)

    // blob shadow hugs the water surface
    this.blobShadow.position.set(b.position.x, 0.05 + wave, b.position.z)
    const alt = Math.max(0, b.position.y - SPAWN.y)
    this.blobShadow.material.opacity = Math.max(0.08, 0.3 - alt * 0.05)

    this.animateDetails(dt, time, controls)
    this.updateWake(dt, time)
  }

  animateDetails(dt, time, controls) {
    const speedNorm = Math.min(1, this.speed / TOP_SPEED)
    const rowing = controls.throttle > 0.1 || this.speed > 2

    // sail billows with speed
    this.parts.sail.scale.z = 0.45 + 0.7 * speedNorm + 0.05 * Math.sin(time * 2.3)
    this.parts.flag.scale.x = 0.7 + 0.4 * Math.abs(Math.sin(time * 5)) * (0.4 + speedNorm)

    // steering oar answers the helm
    this.parts.rudder.rotation.y = controls.steer * 0.55

    // synchronized rowing — the crew pulls when you throttle
    if (rowing) {
      this.oarPhase += dt * (2.5 + 7 * speedNorm)
    }
    const pull = Math.sin(this.oarPhase)
    const sweep = Math.cos(this.oarPhase)
    for (const [oars, side] of [
      [this.parts.oarsLeft, 1],
      [this.parts.oarsRight, -1],
    ]) {
      for (const pivot of oars) {
        if (rowing) {
          pivot.rotation.y = sweep * 0.4
          pivot.rotation.z = side * (-0.38 - 0.16 * Math.max(0, pull))
        } else {
          // oars shipped: raised out of the water
          pivot.rotation.y += (0 - pivot.rotation.y) * Math.min(1, dt * 3)
          pivot.rotation.z += (side * -0.12 - pivot.rotation.z) * Math.min(1, dt * 3)
        }
      }
    }
  }

  updateWake(dt, time) {
    const speedNorm = Math.min(1, this.speed / TOP_SPEED)

    for (const p of this.wake) {
      if (!p.mesh.visible) continue
      p.age += dt
      if (p.age >= p.life) {
        p.mesh.visible = false
        continue
      }
      const t = p.age / p.life
      const s = p.startScale + t * 3.2
      p.mesh.scale.set(s, s, s)
      p.mesh.material.opacity = (1 - t) * 0.5
      p.mesh.position.y = 0.07 + waveHeight(p.mesh.position.x, p.mesh.position.z, time)
    }

    this.wakeTimer -= dt
    if (this.speed > 3 && this.wakeTimer <= 0 && this.groundedSmooth > 0.4) {
      this.wakeTimer = 0.09 - 0.05 * speedNorm
      const fwd = this.forward
      const b = this.body.position
      // stern wash + bow spray
      this.spawnWake(b.x - fwd.x * 3.4, b.z - fwd.z * 3.4, 0.7 + speedNorm)
      if (this.speed > 8) {
        const side = Math.random() > 0.5 ? 1 : -1
        this.spawnWake(
          b.x + fwd.x * 3 - fwd.z * side * 0.9,
          b.z + fwd.z * 3 + fwd.x * side * 0.9,
          0.35
        )
      }
    }
  }

  spawnWake(x, z, scale) {
    const p = this.wake.find((w) => !w.mesh.visible)
    if (!p) return
    p.age = 0
    p.life = 0.9 + Math.random() * 0.4
    p.startScale = scale
    p.mesh.position.set(x + (Math.random() - 0.5) * 0.6, 0.07, z + (Math.random() - 0.5) * 0.6)
    p.mesh.scale.setScalar(scale)
    p.mesh.visible = true
  }
}
