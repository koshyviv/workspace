import type { SceneConfig } from '../../types'
import { Viewport } from '../viewports/Viewport'
import { cameraBus } from '../sync/CameraBus'

// Wrapper that prefers @mkkellogg/gaussian-splats-3d if available
export class SplatsPane extends Viewport {
  private containerEl!: HTMLDivElement
  private gs3d: any | null = null
  private sceneHandle: any | null = null
  private bg = '#0b0e12'
  private infoEl!: HTMLDivElement

  mount(): void {
    this.containerEl = document.createElement('div')
    Object.assign(this.containerEl.style, { width: '100%', height: '100%' })
    this.container.appendChild(this.containerEl)

    this.infoEl = document.createElement('div')
    Object.assign(this.infoEl.style, { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: '0.8', fontSize: '12px' })
    this.infoEl.textContent = 'Waiting for splat file…'
    this.container.appendChild(this.infoEl)

    // Lazy import to avoid bundling errors if not installed
    import('@mkkellogg/gaussian-splats-3d').then(mod => {
      const { GaussianSplats3D } = mod as any
      this.gs3d = new GaussianSplats3D(this.containerEl, {
        cameraUp: [0,1,0],
        sphericalHarmonicsDegree: 0,
        backgroundColor: this.bg,
      })
      this.infoEl.textContent = 'No splat scene loaded.'
      // Sync with driver
      cameraBus.subscribe((pose, sourceId) => {
        if (!this.driver && sourceId !== this.id && this.gs3d) {
          this.gs3d.camera.position = pose.position
          this.gs3d.camera.lookAt(pose.target)
          this.gs3d.camera.up = pose.up
          this.gs3d.camera.fov = pose.fov
          this.gs3d.requestRender()
        }
      })
    }).catch(() => {
      this.infoEl.textContent = 'Install @mkkellogg/gaussian-splats-3d to enable splats.'
    })
  }

  unmount(): void { /* no-op */ }

  protected onAttachScene(scene: SceneConfig): void {
    if (!this.gs3d) return
    if (scene.splats?.ply) {
      this.sceneHandle = this.gs3d.addSplatScene(scene.splats.ply)
      this.infoEl.remove()
    } else {
      this.infoEl.textContent = 'No splat scene configured.'
    }
  }

  setBackground(color: string): void {
    this.bg = color
    if (this.gs3d) {
      this.gs3d.setBackgroundColor(color)
      this.gs3d.requestRender()
    }
  }

  setWireframe(_enabled: boolean): void { /* N/A */ }
  setQuality(_level: number): void { /* TODO */ }
  updateMetrics(): void { /* TODO: plumb fps from GS3D */ }

  getPose() { return null }
  applyPose(_pose: import('../../types').CameraPose) { /* handled in bus subscription */ }
}
