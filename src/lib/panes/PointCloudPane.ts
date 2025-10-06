import * as THREE from 'three'
import { PLYLoader } from 'three-stdlib'
import type { SceneConfig } from '../../types'
import { ThreeViewport } from '../viewports/ThreeViewport'

export class PointCloudPane extends ThreeViewport {
  private pointSize = 1.5
  private material?: THREE.PointsMaterial

  protected async onAttachScene(scene: SceneConfig) {
    if (scene.pointCloud?.ply) {
      const loader = new PLYLoader()
      loader.load(
        scene.pointCloud.ply,
        geometry => {
          geometry.computeBoundingBox()
          geometry.center()
          const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
          this.material = new THREE.PointsMaterial({ size: this.pointSize, vertexColors: !!colorAttr, sizeAttenuation: true })
          const pts = new THREE.Points(geometry, this.material)
          this.scene3.add(pts)
          this.frameToObject(pts)
        },
        undefined,
        () => this.loadDemoCloud()
      )
    } else {
      this.loadDemoCloud()
    }
  }

  private async loadDemoCloud() {
    // Try to load generated demo point cloud first
    try {
      const { getDemoAssetURL } = await import('../utils/generateDemoAssets')
      const url = await getDemoAssetURL('pointcloud')
      const loader = new PLYLoader()
      loader.load(
        url,
        geometry => {
          geometry.computeBoundingBox()
          geometry.center()
          const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined
          this.material = new THREE.PointsMaterial({ size: this.pointSize, vertexColors: !!colorAttr, sizeAttenuation: true })
          const pts = new THREE.Points(geometry, this.material)
          this.scene3.add(pts)
          this.frameToObject(pts)
        },
        undefined,
        () => this.spawnDemoCloud()
      )
    } catch (err) {
      console.error('Failed to load demo point cloud:', err)
      this.spawnDemoCloud()
    }
  }

  private spawnDemoCloud() {
      // Fallback demo cloud
      const g = new THREE.BufferGeometry()
      const N = 20000
      const pos = new Float32Array(N * 3)
      for (let i = 0; i < N; i++) {
        pos[i*3+0] = (Math.random()-0.5)*2
        pos[i*3+1] = (Math.random()-0.5)*2
        pos[i*3+2] = (Math.random()-0.5)*2
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      this.material = new THREE.PointsMaterial({ size: this.pointSize, color: 0x66ccff, sizeAttenuation: true })
      const pts = new THREE.Points(g, this.material)
      this.scene3.add(pts)
      this.frameToObject(pts)
  }

  setQuality(level: number): void {
    this.pointSize = 0.5 + level * 2
    if (this.material) this.material.size = this.pointSize
  }

  setWireframe(_enabled: boolean): void { /* N/A for points */ }

  private frameToObject(obj: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(obj)
    const size = box.getSize(new THREE.Vector3()).length()
    const center = box.getCenter(new THREE.Vector3())
    this.controls.target.copy(center)
    this.camera.position.copy(center.clone().add(new THREE.Vector3(size/2, size/3, size/2)))
    this.camera.near = size / 100
    this.camera.far = size * 10
    this.camera.updateProjectionMatrix()
  }
}
