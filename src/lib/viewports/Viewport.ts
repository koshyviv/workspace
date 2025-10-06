import type { CameraPose, SceneConfig } from '../../types'

export type ViewportOptions = {
  id: string
  title: string
  container: HTMLElement
  onRequestDriver: (id: string) => void
}

export abstract class Viewport {
  readonly id: string
  readonly title: string
  protected container: HTMLElement
  protected headerEl: HTMLElement
  protected metricsEl: HTMLElement
  protected driver = false
  protected scene?: SceneConfig

  constructor(opts: ViewportOptions) {
    this.id = opts.id
    this.title = opts.title
    this.container = opts.container

    // Header UI
    this.headerEl = document.createElement('div')
    this.headerEl.className = 'pane-header'
    this.headerEl.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center;">
        <strong>${this.title}</strong>
        <span class="badge" data-role="role">Follower</span>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <button class="button" data-role="driver">Make Driver</button>
      </div>
    `
    this.container.appendChild(this.headerEl)

    const driverBtn = this.headerEl.querySelector<HTMLButtonElement>('[data-role="driver"]')!
    driverBtn.addEventListener('click', () => opts.onRequestDriver(this.id))

    this.metricsEl = document.createElement('div')
    this.metricsEl.className = 'metrics'
    this.metricsEl.innerHTML = '<span>FPS: —</span><span>GPU: —</span><span>Prim: —</span>'
    this.container.appendChild(this.metricsEl)
  }

  setDriver(driver: boolean) {
    this.driver = driver
    const role = this.headerEl.querySelector('[data-role="role"]') as HTMLElement
    const btn = this.headerEl.querySelector('[data-role="driver"]') as HTMLButtonElement
    if (driver) {
      role.textContent = 'Driver'
      role.style.background = '#274d38'
      role.style.color = '#c0ffd6'
      btn.setAttribute('disabled', 'true')
      btn.textContent = 'Driver'
    } else {
      role.textContent = 'Follower'
      role.style.background = ''
      role.style.color = ''
      btn.removeAttribute('disabled')
      btn.textContent = 'Make Driver'
    }
  }

  attachScene(scene: SceneConfig) { this.scene = scene; this.onAttachScene(scene) }
  protected abstract onAttachScene(scene: SceneConfig): void
  abstract mount(): void
  abstract unmount(): void
  abstract setBackground(color: string): void
  abstract setWireframe(enabled: boolean): void
  abstract setQuality(level: number): void
  abstract updateMetrics(): void
  abstract getPose(): CameraPose | null
  abstract applyPose(pose: CameraPose): void
}

