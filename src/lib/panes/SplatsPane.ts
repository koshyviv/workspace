import type { CameraPose, SceneConfig } from '../../types'
import { Viewport } from '../viewports/Viewport'
import { cameraBus } from '../sync/CameraBus'
import * as THREE from 'three'
import { OrbitControls, PLYLoader } from 'three-stdlib'

// Wrapper that prefers @mkkellogg/gaussian-splats-3d if available
export class SplatsPane extends Viewport {
  private containerEl!: HTMLDivElement
  private gs3d: any | null = null
  private sceneHandle: any | null = null
  private bg = '#0b0e12'
  private infoEl!: HTMLDivElement
  private fallback?: {
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    material?: THREE.PointsMaterial
    raf: number
  }

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
      this.infoEl.textContent = 'Using fallback points (install @mkkellogg/gaussian-splats-3d for true splats).'
    })
  }

  unmount(): void { /* no-op */ }

  protected onAttachScene(scene: SceneConfig): void {
    // Prefer 3DGS if provided
    if (this.gs3d && scene.splats?.ply) {
      try {
        this.sceneHandle = this.gs3d.addSplatScene(scene.splats.ply)
        this.infoEl.remove()
        return
      } catch (e) {
        this.infoEl.textContent = 'Failed to load splat PLY; falling back to points.'
      }
    }
    // Fallback point renderer using point cloud PLY
    if (scene.pointCloud?.ply) {
      this.enableFallbackWithPLY(scene.pointCloud.ply)
      this.infoEl.textContent = 'Fallback point renderer (approx splats)'
    } else {
      this.infoEl.textContent = 'No splat or point-cloud asset provided.'
    }
  }

  setBackground(color: string): void {
    this.bg = color
    if (this.gs3d) {
      this.gs3d.setBackgroundColor(color)
      this.gs3d.requestRender()
    }
    if (this.fallback) this.fallback.renderer.setClearColor(new THREE.Color(color), 1)
  }

  setWireframe(_enabled: boolean): void { /* N/A */ }
  setQuality(_level: number): void { /* TODO */ }
  updateMetrics(): void { /* TODO: plumb fps from GS3D */ }

  getPose() {
    if (this.fallback) {
      const { camera, controls } = this.fallback
      return {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number,number,number],
        target: [controls.target.x, controls.target.y, controls.target.z] as [number,number,number],
        up: [camera.up.x, camera.up.y, camera.up.z] as [number,number,number],
        fov: camera.fov,
      }
    }
    return null
  }
  applyPose(pose: CameraPose) {
    if (this.gs3d && !this.fallback) {
      this.gs3d.camera.position = pose.position
      this.gs3d.camera.lookAt(pose.target)
      this.gs3d.camera.up = pose.up
      this.gs3d.camera.fov = pose.fov
      this.gs3d.requestRender()
      return
    }
    if (this.fallback) {
      const { camera, controls } = this.fallback
      camera.position.set(...pose.position)
      controls.target.set(...pose.target)
      camera.up.set(...pose.up)
      camera.fov = pose.fov
      camera.updateProjectionMatrix()
    }
  }

  private enableFallbackWithPLY(url: string) {
    if (this.fallback) return
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    this.container.appendChild(canvas)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(this.container.clientWidth, this.container.clientHeight, false)
    renderer.setClearColor(new THREE.Color(this.bg), 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000)
    camera.position.set(2,2,2)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    const ro = new ResizeObserver(() => {
      const w = this.container.clientWidth
      const h = this.container.clientHeight
      camera.aspect = Math.max(1e-6, w / Math.max(1, h))
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    })
    ro.observe(this.container)
    this.fallback = { renderer, scene, camera, controls, raf: 0 }

    const loader = new PLYLoader()
    loader.load(url, geometry => {
      geometry.computeBoundingBox()
      geometry.center()
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
      const material = new THREE.PointsMaterial({ size: 1.5, vertexColors: !!colorAttr, sizeAttenuation: true })
      this.fallback!.material = material
      const pts = new THREE.Points(geometry, material)
      scene.add(pts)
      const box = new THREE.Box3().setFromObject(pts)
      const size = box.getSize(new THREE.Vector3()).length()
      const center = box.getCenter(new THREE.Vector3())
      controls.target.copy(center)
      camera.position.copy(center.clone().add(new THREE.Vector3(size/2, size/3, size/2)))
      camera.near = size / 100
      camera.far = size * 10
      camera.updateProjectionMatrix()
    }, undefined, () => {
      this.infoEl.textContent = 'Failed to load PLY for fallback.'
    })

    const loop = () => {
      this.fallback!.raf = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()
  }
}
