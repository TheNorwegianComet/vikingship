import './style.css'
import { Experience } from './Experience.js'

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

if (webglAvailable()) {
  new Experience(document.getElementById('app'))
} else {
  const msg = document.createElement('div')
  msg.id = 'nogl'
  msg.innerHTML =
    'This longship needs WebGL2 to sail.<br/>Your browser or device has it disabled — try another one, and Odin be with you.'
  document.body.appendChild(msg)
  document.getElementById('intro').classList.add('hidden')
}
