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
    'Denne drakkaren trenger WebGL2 for å seile.<br/>Nettleseren din har det avskrudd — prøv en annen, og må Odin være med deg.'
  document.body.appendChild(msg)
  document.getElementById('intro').classList.add('hidden')
}
