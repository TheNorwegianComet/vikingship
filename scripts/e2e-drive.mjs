// End-to-end drive of the viking ship site in headless Chromium.
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = 'http://localhost:4173/'
const SHOTS = new URL('./shots/', import.meta.url).pathname
fs.mkdirSync(SHOTS, { recursive: true })

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

await page.goto(BASE)
await page.waitForTimeout(2500)

check('webgl2 available', await page.evaluate(() => !!window.__game), '')
check('no #nogl fallback shown', (await page.locator('#nogl').count()) === 0)
await page.screenshot({ path: SHOTS + '01-intro.png' })

// --- set sail ---
await page.click('#setSail')
await page.waitForTimeout(1200)
const p0 = await page.evaluate(() => ({ ...window.__game.ship.body.position }))

// Headless swiftshader renders slowly, so the sim runs below real time —
// wait on in-game state with generous timeouts instead of wall-clock time.
async function holdUntil(key, predicate, timeoutMs) {
  await page.keyboard.down(key)
  const t0 = Date.now()
  let state
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(200)
    state = await page.evaluate(predicate)
    if (state.done) break
  }
  await page.keyboard.up(key)
  return state
}

// --- drive forward through the VIKING letters (row at z=21) ---
await page.evaluate(() => (window.__maxSpeed = 0))
const fwdState = await holdUntil(
  'KeyW',
  () => {
    window.__maxSpeed = Math.max(window.__maxSpeed, window.__game.ship.speed)
    return {
      done: window.__game.ship.body.position.z > 24,
      z: window.__game.ship.body.position.z,
      maxSpeed: window.__maxSpeed,
    }
  },
  20000
)
check(
  'W drives ship forward (+z)',
  fwdState.done,
  `z ${p0.z.toFixed(1)} -> ${fwdState.z.toFixed(1)}, peak speed ${fwdState.maxSpeed.toFixed(1)} m/s`
)
check(
  'peak speed within sane bounds',
  fwdState.maxSpeed > 8 && fwdState.maxSpeed < 30,
  `${fwdState.maxSpeed.toFixed(1)} m/s`
)
await page.screenshot({ path: SHOTS + '02-sailing.png' })

const letterScatter = await page.evaluate(() => {
  const synced = window.__game.physics.synced
  let maxV = 0
  for (const s of synced.slice(0, 10)) maxV = Math.max(maxV, Math.abs(s.body.velocity.x) + Math.abs(s.body.velocity.z))
  return maxV
})
check('crashing through letters scatters them', letterScatter > 0.5, `max letter |v| ${letterScatter.toFixed(2)}`)

// --- steer left: from a clean reset, yaw should increase (left = +x = +yaw) ---
await page.keyboard.press('KeyR')
await page.waitForTimeout(400)
await page.keyboard.down('KeyW')
await page.waitForTimeout(800)
const yaw0 = await page.evaluate(() => window.__game.ship.getYaw())
const steerState = await holdUntil(
  'KeyA',
  () => ({ done: false, yaw: window.__game.ship.getYaw() }),
  3500
)
await page.keyboard.up('KeyW')
check(
  'A steers left (yaw increases)',
  steerState.yaw - yaw0 > 0.25,
  `yaw ${yaw0.toFixed(2)} -> ${steerState.yaw.toFixed(2)}`
)
await page.screenshot({ path: SHOTS + '03-turning.png' })

// --- brake ---
const vPre = await page.evaluate(() => window.__game.ship.speed)
const brakeState = await holdUntil(
  'Space',
  () => ({ done: window.__game.ship.speed < 1, speed: window.__game.ship.speed }),
  6000
)
check('space brakes to a stop', brakeState.done, `speed ${vPre.toFixed(1)} -> ${brakeState.speed.toFixed(2)} m/s`)

// --- reset ---
await page.keyboard.press('KeyR')
await page.waitForTimeout(400)
const p4 = await page.evaluate(() => ({ ...window.__game.ship.body.position }))
check('R resets to spawn', Math.hypot(p4.x, p4.z) < 1.5, `pos (${p4.x.toFixed(1)}, ${p4.z.toFixed(1)})`)

// --- runestone trigger: teleport next to the VEIEN HIT stone ---
await page.evaluate(() => {
  const b = window.__game.ship.body
  b.position.set(-36, 1.6, 40)
  b.velocity.setZero()
})
await page.waitForTimeout(600)
const panelInfo = await page.evaluate(() => ({
  hidden: document.getElementById('panel').classList.contains('hidden'),
  title: document.getElementById('panelTitle').textContent,
}))
check('sailing near runestone opens panel', !panelInfo.hidden && panelInfo.title === 'Veien hit', JSON.stringify(panelInfo))
await page.screenshot({ path: SHOTS + '04-panel.png' })

// --- goal: fire the ball into the England net, expect the score to tick ---
await page.evaluate(() => {
  const w = window.__game.world
  const g = w.goal
  // place the ball 6m out on the goal axis and shoot it in
  w.ball.position.set(g.center.x + g.facing.x * 6, 1.2, g.center.z + g.facing.z * 6)
  w.ball.velocity.set(-g.facing.x * 14, 0, -g.facing.z * 14)
  w.ball.wakeUp() // a resting body sleeps; velocity alone won't move it
})
const goalState = await (async () => {
  const t0 = Date.now()
  while (Date.now() - t0 < 10000) {
    await page.waitForTimeout(300)
    const s = await page.evaluate(() => ({
      score: window.__game.world.goal.score,
      toast: !document.getElementById('goalToast').classList.contains('hidden'),
      scoreText: document.getElementById('score').textContent,
    }))
    if (s.score > 0) return s
  }
  return { score: 0, toast: false, scoreText: '' }
})()
check('shooting the ball into the net scores', goalState.score >= 1, JSON.stringify(goalState))
await page.screenshot({ path: SHOTS + '05-goal.png' })

// sail away -> panel closes
await page.evaluate(() => {
  const b = window.__game.ship.body
  b.position.set(0, 1.6, 0)
  b.velocity.setZero()
})
await page.waitForTimeout(600)
const panelClosed = await page.evaluate(() =>
  document.getElementById('panel').classList.contains('hidden')
)
check('sailing away closes panel', panelClosed)

// --- probe: key mash + resize mid-drive ---
for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']) await page.keyboard.down(k)
await page.waitForTimeout(400)
for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']) await page.keyboard.up(k)
await page.setViewportSize({ width: 700, height: 900 })
await page.waitForTimeout(500)
await page.setViewportSize({ width: 1280, height: 800 })
await page.waitForTimeout(500)
const aliveAfterChaos = await page.evaluate(() => window.__game.ship.speed >= 0)
check('key-mash + resize survives', aliveAfterChaos)

// --- probe: ramp jump — line up before the ramp (lane at x=-26) and gun it ---
await page.evaluate(() => {
  const b = window.__game.ship.body
  b.position.set(-26, 1.6, 30)
  b.quaternion.set(0, 0, 0, 1)
  b.velocity.setZero()
  b.angularVelocity.setZero()
})
await page.keyboard.down('KeyW')
let maxY = 0
const tRamp = Date.now()
let rampZ = 0
while (Date.now() - tRamp < 25000) {
  await page.waitForTimeout(150)
  const s = await page.evaluate(() => ({
    y: window.__game.ship.body.position.y,
    z: window.__game.ship.body.position.z,
  }))
  if (s.y > maxY) maxY = s.y
  rampZ = s.z
  if (s.z > 66) break
}
await page.keyboard.up('KeyW')
check('ramp launches ship into the air', maxY > 3.2, `max chassis y ${maxY.toFixed(2)}`)
check('lands past the ramp', rampZ > 62, `z ${rampZ.toFixed(1)}`)

// --- photo modes for visual review ---
for (const mode of ['hero', 'side', 'front', 'action']) {
  await page.goto(BASE + '?photo=' + mode)
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${SHOTS}photo-${mode}.png` })
}

check('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '))

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
