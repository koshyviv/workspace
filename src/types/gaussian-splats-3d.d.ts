declare module '@mkkellogg/gaussian-splats-3d' {
  export class GaussianSplats3D {
    constructor(el: HTMLElement, opts?: any)
    camera: {
      position: [number, number, number]
      up: [number, number, number]
      fov: number
      lookAt: (target: [number, number, number]) => void
    }
    addSplatScene: (url: string) => any
    setBackgroundColor: (c: string) => void
    requestRender: () => void
  }
}

