export type Vec3 = [number, number, number]

export type CameraPose = {
  position: Vec3
  target: Vec3
  up: Vec3
  fov: number
}

export type SceneConfig = {
  name: string
  nerf?: {
    // When using server-side rendering
    serverUrl?: string // e.g., http://localhost:7007
    stream?: boolean
  }
  pointCloud?: {
    ply?: string // path to PLY
    potree?: {
      url: string // Potree tiles
    }
  }
  mesh?: {
    gltf?: string // path to GLB/GLTF
  }
  splats?: {
    ply?: string // path to 3DGS-format PLY
  }
  intrinsics?: {
    fx: number
    fy: number
    cx: number
    cy: number
  }
  initialCamera?: CameraPose
}

