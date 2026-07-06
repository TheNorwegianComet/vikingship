const PANELS = {
  projects: {
    title: 'Projects',
    html: `
      <p>Raids &amp; expeditions of this humble shipwright:</p>
      <div class="card"><b>⚓ Drakkar</b> — this very site. A longship with car physics:
        Three.js, cannon-es and zero 3D-model files — every plank is a primitive.</div>
      <div class="card"><b>ᚱ Rune Translator</b> — Elder Futhark ↔ English, because someone
        has to read the standing stones.</div>
      <div class="card"><b>🌊 Fjord Forecast</b> — sailing weather for the North Sea.
        Mostly says "wind".</div>
      <p class="rune-sep">ᛉ ᛉ ᛉ</p>
      <p><i>Replace these with your own quests — they live in <b>src/ui.js</b>.</i></p>`,
  },
  about: {
    title: 'About',
    html: `
      <p><b>Skål!</b> You've sailed to the About island.</p>
      <p>This is a tribute to <a href="https://bruno-simon.com" target="_blank" rel="noreferrer">
      bruno-simon.com</a> — the legendary drivable portfolio — except the car is a
      <b>viking longship</b>: same raycast-vehicle physics underneath, but the wheels are
      invisible and the sea does the rolling.</p>
      <p>Rowing crew animates when you throttle, the steering oar answers the helm, and the
      waves are pure vertex trickery — the physics world is as flat as the earth was
      once believed to be.</p>
      <p class="rune-sep">ᚠ ᚢ ᚦ</p>
      <p><i>Put your own saga here — <b>src/ui.js</b>.</i></p>`,
  },
  contact: {
    title: 'Contact',
    html: `
      <p>Send a raven, or:</p>
      <div class="card"><b>ᛒ Written word</b> — you@example.com</div>
      <div class="card"><b>ᛏ GitHub</b> — <a href="https://github.com/thenorwegiancomet/vikingship"
        target="_blank" rel="noreferrer">thenorwegiancomet/vikingship</a></div>
      <p>Longboat parking available. Beware of serpent.</p>
      <p class="rune-sep">ᛗ ᛗ ᛗ</p>
      <p><i>Edit your contact details in <b>src/ui.js</b>.</i></p>`,
  },
}

export class UI {
  constructor() {
    this.intro = document.getElementById('intro')
    this.hud = document.getElementById('hud')
    this.panel = document.getElementById('panel')
    this.panelTitle = document.getElementById('panelTitle')
    this.panelBody = document.getElementById('panelBody')
    this.speedValue = document.getElementById('speedValue')
    this.currentPanel = null
    this.onStart = null
    this.onReset = null

    document.getElementById('setSail').addEventListener('click', () => this.start())
    document.getElementById('panelClose').addEventListener('click', () => this.closePanel())
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (this.onReset) this.onReset()
    })
  }

  start() {
    this.intro.classList.add('fading')
    setTimeout(() => this.intro.classList.add('hidden'), 900)
    this.hud.classList.remove('hidden')
    if (this.onStart) this.onStart()
  }

  hideIntroImmediately() {
    this.intro.classList.add('hidden')
    this.hud.classList.remove('hidden')
  }

  openPanel(key) {
    const data = PANELS[key]
    if (!data || this.currentPanel === key) return
    this.currentPanel = key
    this.panelTitle.textContent = data.title
    this.panelBody.innerHTML = data.html
    this.panel.classList.remove('hidden')
  }

  closePanel() {
    this.currentPanel = null
    this.panel.classList.add('hidden')
  }

  closePanelIf(key) {
    if (this.currentPanel === key) this.closePanel()
  }

  setSpeed(knots) {
    this.speedValue.textContent = String(Math.round(knots))
  }
}
