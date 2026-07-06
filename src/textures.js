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

// Flat flag artwork drawn onto a canvas context. Approximate but recognizable.
function drawFlag(ctx, kind, w, h) {
  switch (kind) {
    case 'norway': {
      ctx.fillStyle = '#ba0c2f'
      ctx.fillRect(0, 0, w, h)
      const cx = w * 0.36
      const cy = h * 0.5
      const ww = h * 0.25 // white band width
      const bw = h * 0.125 // blue band width
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - ww / 2, 0, ww, h)
      ctx.fillRect(0, cy - ww / 2, w, ww)
      ctx.fillStyle = '#00205b'
      ctx.fillRect(cx - bw / 2, 0, bw, h)
      ctx.fillRect(0, cy - bw / 2, w, bw)
      break
    }
    case 'england': {
      ctx.fillStyle = '#f4f4f0'
      ctx.fillRect(0, 0, w, h)
      const bw = h * 0.16
      ctx.fillStyle = '#ce1124'
      ctx.fillRect(w / 2 - bw / 2, 0, bw, h)
      ctx.fillRect(0, h / 2 - bw / 2, w, bw)
      break
    }
    case 'iraq': {
      ctx.fillStyle = '#ce1126'
      ctx.fillRect(0, 0, w, h / 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, h / 3, w, h / 3)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, (2 * h) / 3, w, h / 3)
      // green script (approximated)
      ctx.strokeStyle = '#007a3d'
      ctx.lineWidth = h * 0.03
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(w * 0.25, h * 0.5)
      ctx.quadraticCurveTo(w * 0.4, h * 0.4, w * 0.5, h * 0.5)
      ctx.quadraticCurveTo(w * 0.62, h * 0.58, w * 0.75, h * 0.47)
      ctx.stroke()
      break
    }
    case 'senegal': {
      ctx.fillStyle = '#00853f'
      ctx.fillRect(0, 0, w / 3, h)
      ctx.fillStyle = '#fdef42'
      ctx.fillRect(w / 3, 0, w / 3, h)
      ctx.fillStyle = '#e31b23'
      ctx.fillRect((2 * w) / 3, 0, w / 3, h)
      drawStar(ctx, w / 2, h / 2, h * 0.16, '#00853f')
      break
    }
    case 'ivorycoast': {
      ctx.fillStyle = '#f77f00'
      ctx.fillRect(0, 0, w / 3, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(w / 3, 0, w / 3, h)
      ctx.fillStyle = '#009e60'
      ctx.fillRect((2 * w) / 3, 0, w / 3, h)
      break
    }
    case 'brazil': {
      ctx.fillStyle = '#009739'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#fedd00'
      ctx.beginPath()
      ctx.moveTo(w * 0.5, h * 0.1)
      ctx.lineTo(w * 0.9, h * 0.5)
      ctx.lineTo(w * 0.5, h * 0.9)
      ctx.lineTo(w * 0.1, h * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#012169'
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.5, h * 0.22, 0, 7)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = h * 0.035
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.78, h * 0.32, -Math.PI * 0.72, -Math.PI * 0.28)
      ctx.stroke()
      break
    }
  }
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.fill()
}

export function makeFlagTexture(kind, size = 256) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = Math.round(size * 0.72)
  const ctx = c.getContext('2d')
  drawFlag(ctx, kind, c.width, c.height)
  return toTexture(c)
}

// The sail — now the Norwegian flag, weathered like proper sailcloth.
export function makeSailTexture(kind = 'norway') {
  const [c, ctx] = canvas(512)
  const rand = mulberry32(11)
  drawFlag(ctx, kind, 512, 512)
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

export function makeBallTexture() {
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#f2f2ee'
  ctx.fillRect(0, 0, 256, 256)
  const rand = mulberry32(41)
  ctx.fillStyle = '#191919'
  for (let i = 0; i < 10; i++) {
    const x = (i % 5) * 56 + (i > 4 ? 28 : 0) + 14
    const y = i > 4 ? 170 : 60
    const r = 22 + rand() * 5
    ctx.beginPath()
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5 + i
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }
  return toTexture(c)
}

// Small wooden plate with painted text (for scoreboards on the flag poles).
export function makeTextPlate(text, { bg = '#7a5326', fg = '#f3e9d2', size = 256 } = {}) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size / 2
  const ctx = c.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6)
  ctx.fillStyle = fg
  ctx.font = `bold ${Math.floor(c.height * 0.34)}px Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    ctx.fillText(line, c.width / 2, c.height * (lines.length === 1 ? 0.5 : 0.3 + i * 0.42))
  })
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
