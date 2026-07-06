import * as THREE from 'three'
import { Physics } from './Physics.js'
import { Ocean, waveHeight } from './Ocean.js'
import { Ship } from './Ship.js'
import { World } from './World.js'
import { Controls } from './Controls.js'
import { UI } from './ui.js'

const FOG_COLOR = 0xd6e9ee

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const skyFragment = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.62));
  float sun = pow(max(dot(normalize(vDir), uSunDir), 0.0), 220.0);
  col += vec3(1.0, 0.9, 0.7) * sun * 0.9;
  float glow = pow(max(dot(normalize(vDir), uSunDir), 0.0), 6.0);
  col += vec3(1.0, 0.82, 0.55) * glow * 0.14;
  gl_FragColor = vec4(col, 1.0);
}
`

export class Experience {
  constructor(container) {
    this.params = new URLSearchParams(location.search)
    this.photoMode = this.params.get('photo')

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(innerWidth, innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(FOG_COLOR, 90, 235)

    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900)
    this.camera.position.set(9, 5, -11)
    this.cameraTarget = new THREE.Vector3(0, 1.5, 0)
    this.mode = 'intro'

    this.buildSky()
    this.buildLights()

    this.ui = new UI()
    this.physics = new Physics()
    this.ocean = new Ocean(this.scene, FOG_COLOR)
    this.ship = new Ship(this.scene, this.physics)
    this.controls = new Controls()
    this.world = new World(this.scene, this.physics, this.ui)

    this.ui.onStart = () => (this.mode = 'play')
    this.ui.onReset = () => this.ship.reset()
    this.controls.onReset = () => this.ship.reset()

    this.clock = new THREE.Clock()
    this.elapsed = 0

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(innerWidth, innerHeight)
    })

    if (this.photoMode) {
      this.ui.hideIntroImmediately()
      this.mode = 'photo'
    }

    // handle for automated tests / tinkering in the console
    window.__game = { experience: this, ship: this.ship, physics: this.physics }

    this.renderer.setAnimationLoop(() => this.tick())
  }

  buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(760, 24, 12),
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uZenith: { value: new THREE.Color('#5fa8cf') },
          uHorizon: { value: new THREE.Color('#e7f2ef') },
          uSunDir: { value: new THREE.Vector3(0.45, 0.55, 0.3).normalize() },
        },
        side: THREE.BackSide,
        depthWrite: false,
      })
    )
    sky.frustumCulled = false
    this.sky = sky
    this.scene.add(sky)
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xbfe3f2, 0x33604c, 0.9))

    const sun = new THREE.DirectionalLight(0xfff2d8, 2.3)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -45
    sun.shadow.camera.right = 45
    sun.shadow.camera.top = 45
    sun.shadow.camera.bottom = -45
    sun.shadow.camera.near = 5
    sun.shadow.camera.far = 160
    sun.shadow.bias = -0.001
    this.sun = sun
    this.scene.add(sun)
    this.scene.add(sun.target)
  }

  updateCamera(dt) {
    const shipPos = this.ship.root.position
    const t = this.elapsed

    if (this.mode === 'photo') {
      const views = {
        hero: [7.5, 4.6, 11.5, 0, 1.8, 0],
        side: [13, 3.2, 0.5, 0, 1.6, 0],
        front: [0.5, 3.4, 13, 0, 2.0, 0],
        top: [0.5, 26, -8, 0, 0, 2],
        action: [8, 6, -12, 0, 1.5, 4],
      }
      const v = views[this.photoMode] || views.hero
      this.camera.position.set(shipPos.x + v[0], v[1], shipPos.z + v[2])
      this.camera.lookAt(shipPos.x + v[3], v[4], shipPos.z + v[5])
      return
    }

    if (this.mode === 'intro') {
      const a = t * 0.18
      this.camera.position.set(
        shipPos.x + Math.sin(a) * 10.5,
        4.2 + Math.sin(t * 0.35) * 0.8,
        shipPos.z + Math.cos(a) * 10.5
      )
      this.camera.lookAt(shipPos.x, 2.0, shipPos.z)
      return
    }

    const fwd = this.ship.forward
    const desired = new THREE.Vector3(
      shipPos.x - fwd.x * 12.5,
      shipPos.y + 6.2,
      shipPos.z - fwd.z * 12.5
    )
    const posLerp = 1 - Math.exp(-dt * 3.2)
    this.camera.position.lerp(desired, posLerp)
    // never let the camera dip under the swell
    const minY = waveHeight(this.camera.position.x, this.camera.position.z, this.elapsed) + 1.6
    if (this.camera.position.y < minY) this.camera.position.y = minY

    const look = new THREE.Vector3(
      shipPos.x + fwd.x * 5,
      shipPos.y + 1.6,
      shipPos.z + fwd.z * 5
    )
    this.cameraTarget.lerp(look, 1 - Math.exp(-dt * 5))
    this.camera.lookAt(this.cameraTarget)

    const targetFov = 60 + Math.min(12, this.ship.speed * 0.42)
    if (Math.abs(targetFov - this.camera.fov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4)
      this.camera.updateProjectionMatrix()
    }
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20)
    this.elapsed += dt
    const t = this.elapsed

    this.controls.update()
    const driving = this.mode === 'play' ? this.controls : { throttle: 0, steer: 0, brake: false }

    this.physics.step(dt)
    this.ship.update(dt, t, driving)
    this.physics.sync(t, waveHeight)
    this.world.update(dt, t, this.ship.root.position)

    const shipPos = this.ship.root.position
    this.ocean.update(t, shipPos.x, shipPos.z, this.camera.position)
    this.sky.position.copy(this.camera.position)

    this.sun.position.set(shipPos.x + 30, 46, shipPos.z + 20)
    this.sun.target.position.copy(shipPos)

    this.updateCamera(dt)
    this.ui.setSpeed(this.ship.speed * 1.94384)

    this.renderer.render(this.scene, this.camera)
  }
}
