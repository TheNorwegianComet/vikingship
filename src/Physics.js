import * as CANNON from 'cannon-es'

// Flat-plane physics world, exactly like driving a car — the "sea" the
// vehicle rolls on is invisible; waves are cosmetic.
export class Physics {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true
    this.world.defaultContactMaterial.friction = 0.25

    this.materials = {
      ground: new CANNON.Material('ground'),
      wheel: new CANNON.Material('wheel'),
      object: new CANNON.Material('object'),
      ball: new CANNON.Material('ball'),
    }

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materials.ground, this.materials.object, {
        friction: 0.35,
        restitution: 0.15,
      })
    )
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materials.object, this.materials.object, {
        friction: 0.3,
        restitution: 0.2,
      })
    )
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materials.ground, this.materials.ball, {
        friction: 0.2,
        restitution: 0.55,
      })
    )
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.materials.object, this.materials.ball, {
        friction: 0.25,
        restitution: 0.65,
      })
    )

    const sea = new CANNON.Body({ mass: 0, material: this.materials.ground })
    sea.addShape(new CANNON.Plane())
    sea.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(sea)

    // Dynamic body <-> mesh pairs synced every frame.
    this.synced = []
  }

  track(mesh, body, { bob = 0 } = {}) {
    this.synced.push({ mesh, body, bob })
  }

  addStaticBox(halfExtents, position, quaternion) {
    const body = new CANNON.Body({ mass: 0, material: this.materials.object })
    body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)))
    body.position.set(...position)
    if (quaternion) body.quaternion.copy(quaternion)
    this.world.addBody(body)
    return body
  }

  addStaticCylinder(radius, height, position) {
    const body = new CANNON.Body({ mass: 0, material: this.materials.object })
    body.addShape(new CANNON.Cylinder(radius, radius, height, 10))
    body.position.set(...position)
    this.world.addBody(body)
    return body
  }

  addDynamicBox(halfExtents, position, mass, mesh, opts) {
    const body = new CANNON.Body({ mass, material: this.materials.object })
    body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)))
    body.position.set(...position)
    body.linearDamping = 0.25
    body.angularDamping = 0.35
    body.sleepSpeedLimit = 0.4
    this.world.addBody(body)
    if (mesh) this.track(mesh, body, opts)
    return body
  }

  addDynamicSphere(radius, position, mass, mesh, opts) {
    const body = new CANNON.Body({ mass, material: this.materials.ball })
    body.addShape(new CANNON.Sphere(radius))
    body.position.set(...position)
    body.linearDamping = 0.18
    body.angularDamping = 0.2
    body.sleepSpeedLimit = 0.3
    this.world.addBody(body)
    if (mesh) this.track(mesh, body, opts)
    return body
  }

  addDynamicCylinder(radius, height, position, mass, mesh, opts) {
    const body = new CANNON.Body({ mass, material: this.materials.object })
    body.addShape(new CANNON.Cylinder(radius, radius, height, 12))
    body.position.set(...position)
    body.linearDamping = 0.3
    body.angularDamping = 0.3
    body.sleepSpeedLimit = 0.4
    this.world.addBody(body)
    if (mesh) this.track(mesh, body, opts)
    return body
  }

  step(dt) {
    this.world.step(1 / 60, dt, 5)
  }

  sync(time, waveHeight) {
    for (const item of this.synced) {
      item.mesh.position.copy(item.body.position)
      item.mesh.quaternion.copy(item.body.quaternion)
      if (item.bob) {
        item.mesh.position.y +=
          waveHeight(item.body.position.x, item.body.position.z, time) * item.bob
      }
    }
  }
}
