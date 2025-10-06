import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import type { SceneConfig } from '../../types'
import { ThreeViewport } from '../viewports/ThreeViewport'

export class MeshPane extends ThreeViewport {
  private root?: THREE.Group

  protected onAttachScene(scene: SceneConfig): void {
    if (scene.mesh?.gltf) {
      const loader = new GLTFLoader()
      loader.load(
        scene.mesh.gltf,
        (gltf) => {
          this.root = gltf.scene
          this.scene3.add(gltf.scene)
          this.frameToObject(gltf.scene)
        },
        undefined,
        () => this.spawnDemoMesh()
      )
    } else {
      this.spawnDemoMesh()
    }
  }

  private spawnDemoMesh() {
      // Demo geometry - torus knot matching other viewers
      const geo = new THREE.TorusKnotGeometry(1, 0.5, 100, 20, 2, 3)
      geo.setAttribute('color', this.generateColorAttribute(geo))
      const mat = new THREE.MeshStandardMaterial({ 
        vertexColors: true,
        metalness: 0.2, 
        roughness: 0.5 
      })
      const mesh = new THREE.Mesh(geo, mat)
      this.scene3.add(mesh)
      this.frameToObject(mesh)
  }

  private generateColorAttribute(geometry: THREE.BufferGeometry): THREE.BufferAttribute {
    const positions = geometry.getAttribute('position')
    const colors = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      colors[i * 3] = (x + 1.5) / 3.0
      colors[i * 3 + 1] = (y + 1.5) / 3.0
      colors[i * 3 + 2] = (z + 1) / 2.0
    }
    return new THREE.BufferAttribute(colors, 3)
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
