import { MeshPane } from './lib/panes/MeshPane'
import { PointCloudPane } from './lib/panes/PointCloudPane'
import { SplatsPane } from './lib/panes/SplatsPane'
import { NerfPane } from './lib/panes/NerfPane'
import type { SceneConfig } from './types'
import { cameraBus } from './lib/sync/CameraBus'

type PaneDef = { id: string; title: string; ctor: any }

const panes: PaneDef[] = [
  { id: 'nerf', title: 'NeRF (Server/Client)', ctor: NerfPane },
  { id: 'cloud', title: 'Point Cloud', ctor: PointCloudPane },
  { id: 'mesh', title: 'MVS Mesh', ctor: MeshPane },
  { id: 'splats', title: 'Gaussian Splats', ctor: SplatsPane }
]

const app = document.getElementById('app')!
const viewports: any[] = []

function createPane(def: PaneDef) {
  const paneEl = document.createElement('div')
  paneEl.className = 'pane'
  app.appendChild(paneEl)
  const vp = new def.ctor({
    id: def.id,
    title: def.title,
    container: paneEl,
    onRequestDriver: setDriver
  })
  vp.mount()
  return vp
}

function setDriver(id: string) {
  cameraBus.driverId = id
  for (const vp of viewports) vp.setDriver(vp.id === id)
  // Send initial pose from the new driver to the bus
  const drv = viewports.find(v => v.id === id)
  const pose = drv?.getPose?.()
  if (pose) cameraBus.emit(pose, id)
}

async function loadScene(scene: SceneConfig) {
  document.getElementById('scene-badge')!.textContent = scene.name
  for (const vp of viewports) vp.attachScene(scene)
  // Initialize camera from scene
  if (scene.initialCamera) cameraBus.emit(scene.initialCamera, 'scene')
}

// Bootstrap UI
for (const def of panes) viewports.push(createPane(def))
setDriver('mesh')

document.getElementById('bg-color')!.addEventListener('input', (e) => {
  const c = (e.target as HTMLInputElement).value
  for (const vp of viewports) vp.setBackground(c)
})

document.getElementById('toggle-wireframe')!.addEventListener('change', (e) => {
  const v = (e.target as HTMLInputElement).checked
  for (const vp of viewports) vp.setWireframe(v)
})

document.getElementById('btn-load-demo')!.addEventListener('click', async () => {
  const res = await fetch('/scenes/demo/scene.json')
  const scene = await res.json() as SceneConfig
  loadScene(scene)
})

