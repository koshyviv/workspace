import { Viewport } from '../viewports/Viewport'
import type { CameraPose, SceneConfig } from '../../types'
import { cameraBus } from '../sync/CameraBus'

// Server-streamed NeRF pane (proxy approach). Renders frames from a backend that accepts camera pose.
export class NerfPane extends Viewport {
  private img!: HTMLImageElement
  private serverUrl: string | null = null
  private lastPose?: CameraPose
  private inflight = false
  private infoEl!: HTMLDivElement

  mount(): void {
    this.img = document.createElement('img')
    Object.assign(this.img.style, { width: '100%', height: '100%', objectFit: 'contain', background: '#0b0e12' })
    this.container.appendChild(this.img)

    this.infoEl = document.createElement('div')
    Object.assign(this.infoEl.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0.8', fontSize: '12px' })
    this.infoEl.textContent = 'NeRF server not connected.'
    this.container.appendChild(this.infoEl)

    this.img.addEventListener('error', () => {
      this.infoEl.textContent = 'Failed to fetch NeRF frame.'
    })

    cameraBus.subscribe((pose, sourceId) => {
      if (!this.driver && sourceId !== this.id) {
        this.lastPose = pose
        this.requestFrame()
      }
    })
  }

  unmount(): void { /* no-op */ }

  protected onAttachScene(scene: SceneConfig): void {
    this.serverUrl = scene.nerf?.serverUrl ?? null
    this.infoEl.textContent = this.serverUrl ? 'Waiting for camera pose…' : 'NeRF server not configured.'
  }

  private async requestFrame() {
    if (!this.serverUrl || !this.lastPose || this.inflight) return
    this.inflight = true
    try {
      const q = new URLSearchParams({
        px: String(this.lastPose.position[0]),
        py: String(this.lastPose.position[1]),
        pz: String(this.lastPose.position[2]),
        tx: String(this.lastPose.target[0]),
        ty: String(this.lastPose.target[1]),
        tz: String(this.lastPose.target[2]),
        ux: String(this.lastPose.up[0]),
        uy: String(this.lastPose.up[1]),
        uz: String(this.lastPose.up[2]),
        fov: String(this.lastPose.fov)
      })
      const url = `${this.serverUrl}/render?${q.toString()}`
      // To avoid CORS issues, backend should set appropriate headers
      this.img.src = url + `&t=${Date.now()}`
      this.infoEl.textContent = ''
    } finally {
      this.inflight = false
    }
  }

  setBackground(_color: string): void { /* background via CSS */ }
  setWireframe(_enabled: boolean): void { /* N/A */ }
  setQuality(_level: number): void { /* TODO: send to server as param */ }
  updateMetrics(): void { /* backend FPS reported separately if desired */ }
  getPose() { return null }
  applyPose(_pose: CameraPose) { /* pull-based, handled by requestFrame */ }
}
