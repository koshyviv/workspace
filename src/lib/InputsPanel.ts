import type { SceneConfig, CameraPose } from '../types'

type InputsInfo = {
  count: number
  cameras: CameraPose[]
}

export class InputsPanel {
  private root: HTMLElement
  private grid: HTMLElement
  private countEl: HTMLElement
  private open = false
  private serverUrl: string | null = null

  constructor(rootId = 'inputs-panel') {
    this.root = document.getElementById(rootId)!
    this.grid = document.getElementById('inputs-grid')!
    this.countEl = document.getElementById('inputs-count')!
  }

  async load(scene: SceneConfig) {
    this.serverUrl = scene.nerf?.serverUrl ?? null
    if (!this.serverUrl) {
      this.grid.innerHTML = '<div class="input-meta">NeRF server not configured.</div>'
      this.countEl.textContent = '0'
      return
    }
    const res = await fetch(`${this.serverUrl}/inputs`)
    if (!res.ok) {
      this.grid.innerHTML = '<div class="input-meta">Failed to fetch inputs.</div>'
      this.countEl.textContent = '0'
      return
    }
    const data = await res.json() as InputsInfo
    this.countEl.textContent = String(data.count)
    this.grid.innerHTML = ''
    for (let i = 0; i < data.count; i++) {
      const card = document.createElement('div')
      card.className = 'input-card'
      const img = document.createElement('img')
      img.src = `${this.serverUrl}/inputs/image/${i}`
      const meta = document.createElement('div')
      meta.className = 'input-meta'
      const cam = data.cameras[i]
      meta.textContent = `#${i} pos=(${(cam.position as [number,number,number]).map((n:number)=>n.toFixed(1)).join(',')}) fov=${cam.fov}`
      card.appendChild(img)
      card.appendChild(meta)
      this.grid.appendChild(card)
    }
  }

  show() { this.open = true; this.root.hidden = false }
  hide() { this.open = false; this.root.hidden = true }
  toggle() { this.open ? this.hide() : this.show() }
}
