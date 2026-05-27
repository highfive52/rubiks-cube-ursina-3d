import './style.css'
import { initScene } from './renderer/scene'

console.log("Rubik's Cube Three.js prototype initializing...")

const app = document.getElementById('app')
if (!app) throw new Error('No #app element found in document')

const container = document.createElement('div')
container.id = 'three-container'
container.style.width = '100%'
container.style.height = '100%'
container.style.flex = '1'
app.appendChild(container)

initScene(container)

console.log('Three.js prototype started')