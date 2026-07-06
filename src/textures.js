import * as THREE from 'three'

// Tiny deterministic PRNG so procedural textures look identical every load.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')]
}

function toTexture(c, { repeat } = {}) {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  return tex
}

export function makePlankTexture(base = '#a9743e', seam = '#7a4e26', planks = 6) {
  const [c, ctx] = canvas(128)
  const rand = mulberry32(7)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 128, 128)
  const h = 128 / planks
  for (let i = 0; i < planks; i++) {
    const y = i * h
    // per-plank tint variation
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,235,200' : '40,20,5'},${0.05 + rand() * 0.08})`
    ctx.fillRect(0, y, 128, h)
    ctx.fillStyle = seam
    ctx.fillRect(0, y, 128, 2)
    // grain flecks
    ctx.fillStyle = 'rgba(50,25,8,0.25)'
    for (let j = 0; j < 5; j++) {
      ctx.fillRect(rand() * 128, y + 3 + rand() * (h - 6), 8 + rand() * 20, 1)
    }
  }
  return toTexture(c, { repeat: [2, 2] })
}

export function makeSailTexture() {
  const [c, ctx] = canvas(512)
  const rand = mulberry32(11)
  const stripes = 8
  const w = 512 / stripes
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#c8452f' : '#efe3c4'
    ctx.fillRect(i * w, 0, w, 512)
  }
  // cloth weave
  ctx.fillStyle = 'rgba(60,30,15,0.06)'
  for (let y = 0; y < 512; y += 5) ctx.fillRect(0, y, 512, 1)
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let x = 0; x < 512; x += 7) ctx.fillRect(x, 0, 1, 512)
  // weathering blotches
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(70,40,15,${0.03 + rand() * 0.05})`
    ctx.beginPath()
    ctx.ellipse(rand() * 512, rand() * 512, 12 + rand() * 42, 8 + rand() * 26, rand() * 3, 0, 7)
    ctx.fill()
  }
  // hems
  ctx.fillStyle = 'rgba(60,30,10,0.35)'
  ctx.fillRect(0, 0, 512, 10)
  ctx.fillRect(0, 502, 512, 10)
  return toTexture(c)
}

export function makeBarrelTexture() {
  const [c, ctx] = canvas(128)
  const rand = mulberry32(23)
  ctx.fillStyle = '#b0854c'
  ctx.fillRect(0, 0, 128, 128)
  // vertical staves
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = `rgba(60,35,10,${0.15 + rand() * 0.15})`
    ctx.fillRect(x, 0, 2, 128)
  }
  // iron bands
  ctx.fillStyle = '#41454c'
  ctx.fillRect(0, 24, 128, 12)
  ctx.fillRect(0, 92, 128, 12)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(0, 24, 128, 2)
  ctx.fillRect(0, 92, 128, 2)
  return toTexture(c)
}

export function makeRadialTexture() {
  const [c, ctx] = canvas(128)
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return toTexture(c)
}

// Procedural rune strokes (only vertical/diagonal lines, like real futhark),
// drawn as lines so we don't depend on any font having rune glyphs.
export function makeRuneTexture(seed = 3) {
  const [c, ctx] = canvas(256)
  const rand = mulberry32(seed)
  ctx.clearRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(35,30,28,0.85)'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  const cols = 2
  const rows = 4
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const x0 = 34 + cx * 120
      const y0 = 20 + cy * 58
      const w = 52
      const h = 44
      // main stave
      ctx.beginPath()
      ctx.moveTo(x0 + w * 0.3, y0)
      ctx.lineTo(x0 + w * 0.3, y0 + h)
      ctx.stroke()
      // 1-3 diagonal branches
      const branches = 1 + Math.floor(rand() * 3)
      for (let b = 0; b < branches; b++) {
        const sy = y0 + rand() * h * 0.7
        ctx.beginPath()
        ctx.moveTo(x0 + w * 0.3, sy)
        ctx.lineTo(x0 + w * (0.65 + rand() * 0.35), sy + (rand() > 0.5 ? 1 : -1) * (10 + rand() * 16))
        ctx.stroke()
      }
    }
  }
  return toTexture(c)
}
