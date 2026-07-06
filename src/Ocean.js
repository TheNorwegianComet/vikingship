import * as THREE from 'three'

// Shared wave field — single source of truth for the water shader AND the
// JS-side bobbing of the ship / floating props. Physics stays on a flat
// plane; the waves are purely visual.
export const WAVES = [
  { dir: [0.85, 0.53], amp: 0.26, wavelength: 19, speed: 1.05 },
  { dir: [-0.64, 0.77], amp: 0.14, wavelength: 9.5, speed: 1.6 },
  { dir: [0.28, -0.96], amp: 0.07, wavelength: 5.2, speed: 2.3 },
]

export function waveHeight(x, z, t) {
  let y = 0
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.wavelength
    y += w.amp * Math.sin((w.dir[0] * x + w.dir[1] * z) * k + t * w.speed)
  }
  return y
}

// Surface slope at a point — used to tilt floating things with the swell.
export function waveSlope(x, z, t) {
  const e = 0.7
  return {
    sx: (waveHeight(x + e, z, t) - waveHeight(x - e, z, t)) / (2 * e),
    sz: (waveHeight(x, z + e, t) - waveHeight(x, z - e, t)) / (2 * e),
  }
}

const f = (n) => n.toFixed(5)

// Inject the same wave constants into GLSL so shader and JS never drift apart.
const waveChunk = WAVES.map(
  (w) =>
    `h += ${f(w.amp)} * sin((${f(w.dir[0])} * p.x + ${f(w.dir[1])} * p.y) * ${f(
      (Math.PI * 2) / w.wavelength
    )} + uTime * ${f(w.speed)});`
).join('\n  ')

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPos;
varying float vH;

float waveH(vec2 p) {
  float h = 0.0;
  ${waveChunk}
  return h;
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = waveH(wp.xz);
  wp.y += h;
  vH = h;
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uCrest;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
uniform vec3 uCamPos;
varying vec3 vWorldPos;
varying float vH;

void main() {
  // Faceted normals from screen-space derivatives -> low-poly water look.
  vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
  if (n.y < 0.0) n = -n;

  float diff = clamp(dot(n, uSunDir), 0.0, 1.0);
  vec3 base = mix(uDeep, uShallow, smoothstep(-0.45, 0.45, vH));
  base = mix(base, uCrest, smoothstep(0.28, 0.55, vH));
  vec3 col = base * (0.5 + 0.6 * diff);

  vec3 v = normalize(uCamPos - vWorldPos);
  vec3 hv = normalize(v + uSunDir);
  col += vec3(1.0, 0.95, 0.82) * pow(max(dot(n, hv), 0.0), 70.0) * 0.5;

  float d = distance(uCamPos, vWorldPos);
  col = mix(col, uFogColor, smoothstep(uFogRange.x, uFogRange.y, d));
  gl_FragColor = vec4(col, 1.0);
}
`

export class Ocean {
  constructor(scene, fogColor) {
    this.size = 520
    this.segments = 130
    this.cell = this.size / this.segments

    this.uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.45, 0.7, 0.3).normalize() },
      uDeep: { value: new THREE.Color('#0e4666') },
      uShallow: { value: new THREE.Color('#1b7fae') },
      uCrest: { value: new THREE.Color('#6fc8e0') },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogRange: { value: new THREE.Vector2(90, 235) },
      uCamPos: { value: new THREE.Vector3() },
    }

    const geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }

  update(time, followX, followZ, cameraPos) {
    this.uniforms.uTime.value = time
    this.uniforms.uCamPos.value.copy(cameraPos)
    // Keep the plane centered on the ship, snapped to the vertex grid so the
    // faceted triangles don't shimmer as the lattice slides.
    this.mesh.position.x = Math.round(followX / this.cell) * this.cell
    this.mesh.position.z = Math.round(followZ / this.cell) * this.cell
  }
}
