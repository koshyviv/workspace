import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import type { CameraPose, SceneConfig } from '../../types'
import { Viewport, type ViewportOptions } from './Viewport'
import { cameraBus } from '../sync/CameraBus'

export abstract class ThreeViewport extends Viewport {
  protected renderer!: THREE.WebGLRenderer
  protected scene3!: THREE.Scene
  protected camera!: THREE.PerspectiveCamera
  protected controls!: OrbitControls
  private raf = 0
  private lastFrame = performance.now()
  private fps = 0
  private bgColor = new THREE.Color('#0b0e12')

  constructor(opts: ViewportOptions) {
    super(opts)
  }

  mount() {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    this.container.appendChild(canvas)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false)
    this.renderer.setClearColor(this.bgColor, 1)

    this.scene3 = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
    this.camera.position.set(2, 2, 2)
    this.camera.lookAt(0, 0, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5,5,5)
    this.scene3.add(ambient, dir)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.addEventListener('change', () => {
      if (this.driver) {
        const pose = this.getPose()
        if (pose) cameraBus.emit(pose, this.id)
      }
    })

    const ro = new ResizeObserver(() => this.resize())
    ro.observe(this.container)

    cameraBus.subscribe((pose, sourceId) => {
      if (!this.driver && sourceId !== this.id) this.applyPose(pose)
    })

    this.start()
  }

  unmount(): void {
    cancelAnimationFrame(this.raf)
    this.controls?.dispose()
    this.renderer?.dispose()
  }

  protected start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.setClearColor(this.bgColor, 1)
      this.render()
      this.updateMetrics()
    }
    loop()
  }

  protected render() {
    const now = performance.now()
    const dt = now - this.lastFrame
    this.lastFrame = now
    this.fps = 1000 / dt
    this.renderer.render(this.scene3, this.camera)
  }

  updateMetrics(): void {
    const prims = this.countPrimitives()
    this.metricsEl.innerHTML = `<span>FPS: ${this.fps.toFixed(1)}</span><span>GPU: n/a</span><span>Prim: ${prims}</span>`
  }

  protected countPrimitives(): number {
    let tris = 0
    this.scene3.traverse(obj => {
      const m = (obj as any).isMesh ? (obj as THREE.Mesh) : null
      if (m && m.geometry) {
        const g = m.geometry as THREE.BufferGeometry
        const index = g.getIndex()
        if (index) tris += index.count / 3
        else tris += g.getAttribute('position').count / 3
      }
      const pts = (obj as any).isPoints ? (obj as THREE.Points) : null
      if (pts) tris += (pts.geometry.getAttribute('position').count)
    })
    return Math.floor(tris)
  }

  setBackground(color: string): void {
    this.bgColor.set(color)
  }

  setWireframe(enabled: boolean): void {
    this.scene3.traverse(obj => {
      const m = (obj as any).isMesh ? (obj as THREE.Mesh) : null
      if (m) {
        const mat = m.material
        if (Array.isArray(mat)) mat.forEach(x => (x as THREE.MeshStandardMaterial).wireframe = enabled)
        else (mat as THREE.MeshStandardMaterial).wireframe = enabled
      }
    })
  }

  setQuality(_level: number): void {
    // Implement per-pane
  }

  getPose(): CameraPose | null {
    const pos = this.camera.position
    const target = new THREE.Vector3(0,0,0)
    this.controls.target && target.copy(this.controls.target)
    return { position: [pos.x, pos.y, pos.z], target: [target.x, target.y, target.z], up: [this.camera.up.x, this.camera.up.y, this.camera.up.z], fov: this.camera.fov }
  }

  applyPose(pose: CameraPose): void {
    this.camera.position.set(...pose.position)
    this.camera.up.set(...pose.up)
    this.camera.fov = pose.fov
    this.controls.target.set(...pose.target)
    this.camera.updateProjectionMatrix()
  }

  protected resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w <= 0 || h <= 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  protected onAttachScene(_scene: SceneConfig): void {}
}

