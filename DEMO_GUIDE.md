# 3D Reconstruction Showdown - Demo Guide

## What This Demo Shows

This application demonstrates **four different 3D reconstruction techniques** rendering the **same scene** (a torus knot shape) so you can compare their visual quality and characteristics:

1. **NeRF (Neural Radiance Fields)** - Server-side rendering with volumetric appearance
2. **Point Cloud** - Dense colored points sampled from the surface
3. **MVS Mesh** - Solid triangulated mesh with vertex colors
4. **Gaussian Splats** - 3D Gaussian splatting for photorealistic rendering

## What Was Set Up

### Frontend (TypeScript + Three.js + Vite)

1. **Generated synthetic demo assets in-browser:**
   - Gaussian Splat PLY file (5,000 splats) - generated at runtime
   - Point Cloud PLY file (10,000 points) - generated at runtime
   - Mesh with vertex colors - uses Three.js TorusKnotGeometry

2. **Enhanced all viewers:**
   - All four viewers now render the **same torus knot shape**
   - Same color gradient applied across all representations
   - Synchronized camera controls - move one, they all follow

### Backend (Python + FastAPI)

1. **Mock NeRF Server** (`server/nerf-proxy/main.py`)
   - Renders synthetic views of the torus knot from any camera angle
   - Simulates volumetric rendering appearance
   - Responds to camera pose updates in real-time

## How to Use the Demo

### Starting the Application

**Backend (NeRF Server):**
```bash
source ~/miniconda3/etc/profile.d/conda.sh
conda activate recon-demo
cd server/nerf-proxy
uvicorn main:app --host 0.0.0.0 --port 7007
```

**Frontend (Web App):**
```bash
source ~/.nvm/nvm.sh
nvm use 20
cd /home/koshy/code/workspace
npm run dev
```

Then open: **http://localhost:5173**

### Using the Interface

1. **Click "Load Demo Scene"** button in the toolbar
   - This loads the demo configuration and generates assets
   - All four viewers will show the same torus knot

2. **Camera Controls:**
   - **Left drag** - Rotate camera
   - **Right drag / two-finger drag** - Pan camera
   - **Scroll / pinch** - Zoom in/out
   - Moving any viewer updates all others in sync!

3. **Make one viewer the "Driver":**
   - Click the "Driver" or "Make Driver" button on any pane
   - The driver viewport controls the camera for all others

4. **Additional Controls:**
   - **Wireframe toggle** - Shows mesh as wireframe (Mesh pane only)
   - **BG color** - Change background color for all viewers

## Comparing the Reconstruction Methods

### NeRF (Top Left)
- **What it shows:** Volumetric rendering with soft, smooth appearance
- **Characteristics:** Continuous representation, good for view synthesis
- **Demo limitation:** Simplified 2D projection (real NeRF would use neural network)

### Point Cloud (Top Right)
- **What it shows:** 10,000 discrete colored points
- **Characteristics:** Simple, fast, but sparse
- **Use case:** Initial reconstruction, quick preview

### MVS Mesh (Bottom Left)
- **What it shows:** Solid triangulated surface with colors
- **Characteristics:** Continuous surface, supports lighting/shading
- **Use case:** Final assets for games, visualization

### Gaussian Splats (Bottom Right)
- **What it shows:** 5,000 3D Gaussians blended together
- **Characteristics:** High quality, photorealistic, real-time rendering
- **Use case:** Novel view synthesis, VR/AR

## Key Differences to Observe

1. **Level of Detail:**
   - Point Cloud: Discrete, you can see individual points
   - Mesh: Smooth continuous surface
   - Splats: Soft, smooth blending
   - NeRF: Volumetric, soft edges

2. **Color Representation:**
   - All use the same gradient but render differently
   - Point Cloud: Per-point colors
   - Mesh: Vertex colors interpolated across triangles
   - Splats: Gaussian-weighted color blending
   - NeRF: Simulated volumetric appearance

3. **Performance:**
   - Mesh: Fast, hardware-accelerated
   - Point Cloud: Fast, simple rendering
   - Splats: Real-time with Gaussian Splatting library
   - NeRF: Slower (would be GPU-intensive in real implementation)

## Understanding the Demo Scene

The **torus knot** shape was chosen because:
- Complex 3D topology (interweaving)
- Easy to generate procedurally
- Same shape across all reconstruction methods
- Color gradient helps visualize orientation

The mathematical definition:
- Parameters: p=2, q=3 (2,3 torus knot)
- Radius R=1.0, tube radius r=0.5
- Color based on spatial position (x, y, z coordinates)

## Extending the Demo

### Using Real Data

To use actual reconstruction data instead of synthetic:

1. **Point Cloud:** Place `.ply` file in `public/assets/`
2. **Mesh:** Place `.gltf` or `.glb` file in `public/assets/`
3. **Gaussian Splats:** Place `.ply` file (Gaussian Splat format) in `public/assets/`
4. **NeRF:** Update `server/nerf-proxy/main.py` to connect to a real Nerfstudio instance

Update `public/scenes/demo/scene.json`:
```json
{
  "name": "My Scene",
  "pointCloud": { "ply": "/assets/my-pointcloud.ply" },
  "mesh": { "gltf": "/assets/my-mesh.gltf" },
  "splats": { "ply": "/assets/my-splat.ply" },
  "nerf": { "serverUrl": "http://localhost:7007" }
}
```

### Data Pipeline (for Real Scenes)

See `scripts/README.md` for the full pipeline:
1. Capture images/video
2. COLMAP for camera poses + sparse reconstruction
3. MVS for dense point cloud
4. Poisson reconstruction for mesh
5. 3D Gaussian Splatting training
6. Nerfstudio training

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Frontend)                 │
│  ┌────────────┬────────────┬────────┬─────────────┐ │
│  │ NeRF Pane  │ Cloud Pane │  Mesh  │ Splats Pane │ │
│  │  (Image)   │ (Three.js) │ (3.js) │   (GS3D)    │ │
│  └─────┬──────┴──────┬─────┴────┬───┴──────┬──────┘ │
│        │             │          │          │         │
│        └─────────────┴──────────┴──────────┘         │
│                  Camera Sync Bus                     │
└────────────┬─────────────────────────────────────────┘
             │ HTTP requests (camera pose)
             ↓
┌────────────────────────────────────────────────────┐
│         NeRF Proxy Server (FastAPI/Python)         │
│  • Receives camera pose                            │
│  • Renders synthetic view                          │
│  • Returns PNG image                               │
└────────────────────────────────────────────────────┘
```

## Troubleshooting

**Gaussian Splats not loading:**
- Check browser console for errors
- Ensure `@mkkellogg/gaussian-splats-3d` is installed: `npm install`
- Try refreshing after clicking "Load Demo Scene"

**NeRF pane shows "Waiting for camera pose":**
- Ensure NeRF server is running on port 7007
- Check: `curl http://localhost:7007/health`
- Move a camera to trigger initial render

**Cameras not syncing:**
- Make sure you clicked "Load Demo Scene"
- Check that one pane is marked as "Driver"

## Credits

- **Three.js** - WebGL rendering
- **@mkkellogg/gaussian-splats-3d** - Real-time Gaussian Splatting
- **FastAPI** - Python web framework
- **Vite** - Frontend build tool

---

Built to demonstrate and compare 3D reconstruction techniques for research and education.
