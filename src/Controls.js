// Keyboard + touch-joystick input, reduced to { throttle, steer, brake }.
// steer: +1 = full left, -1 = full right. throttle: +1 forward, -1 reverse.
export class Controls {
  constructor() {
    this.throttle = 0
    this.steer = 0
    this.brake = false
    this.onReset = null

    this.keys = new Set()
    this.joy = { active: false, x: 0, y: 0 }

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.keys.add(e.code)
      if (e.code === 'KeyR' && this.onReset) this.onReset()
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())

    this.initJoystick()
  }

  initJoystick() {
    const zone = document.getElementById('joystick')
    const knob = document.getElementById('joystickKnob')
    if (!zone || !knob) return

    if (window.matchMedia('(pointer: coarse)').matches) {
      zone.classList.remove('hidden')
    }

    const radius = 44
    let pointerId = null

    const setKnob = (x, y) => {
      knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`
    }

    const handle = (e) => {
      const rect = zone.getBoundingClientRect()
      let x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
      let y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
      const len = Math.hypot(x, y)
      if (len > 1) {
        x /= len
        y /= len
      }
      this.joy.x = x
      this.joy.y = y
      setKnob(x, y)
    }

    zone.addEventListener('pointerdown', (e) => {
      pointerId = e.pointerId
      zone.setPointerCapture(pointerId)
      this.joy.active = true
      handle(e)
    })
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointerId && this.joy.active) handle(e)
    })
    const end = (e) => {
      if (e.pointerId !== pointerId) return
      this.joy.active = false
      this.joy.x = 0
      this.joy.y = 0
      setKnob(0, 0)
    }
    zone.addEventListener('pointerup', end)
    zone.addEventListener('pointercancel', end)
  }

  update() {
    const k = this.keys
    let throttle = 0
    let steer = 0

    if (k.has('KeyW') || k.has('ArrowUp')) throttle += 1
    if (k.has('KeyS') || k.has('ArrowDown')) throttle -= 1
    if (k.has('KeyA') || k.has('ArrowLeft')) steer += 1
    if (k.has('KeyD') || k.has('ArrowRight')) steer -= 1

    if (this.joy.active) {
      throttle += -this.joy.y
      steer += -this.joy.x
    }

    this.throttle = Math.max(-1, Math.min(1, throttle))
    this.steer = Math.max(-1, Math.min(1, steer))
    this.brake = k.has('Space')
  }
}
