Reconstruction Showdown (NeRF vs Cloud vs Mesh vs Splats)

Overview
- Single-page web app that shows four synchronized viewports: NeRF, Point Cloud, MVS Mesh, Gaussian Splats.
- One viewport is the camera “driver”; others follow via a shared camera bus.
- Minimal UI: scene switcher, wireframe toggle, background color, basic metrics.
 - Includes a self-contained demo dataset (synthetic cube): images + cameras.json generated on server startup; point cloud PLY and mesh assets published for the web app.

Monorepo Layout
- Web app (Vite + TypeScript + three.js): index.html, src/*
- Backend stub (FastAPI) for NeRF server rendering: server/nerf-proxy/*
- Data prep scripts (COLMAP, Poisson, Potree, 3DGS): scripts/*

Quick Start
1) Install Node 18+ and Python 3.10+.
2) Install web deps: `npm i`
3) Start everything (web + NeRF proxy): `npm run start`
   - Or start only the web: `npm run dev`
   - Or start only the proxy: from `server/nerf-proxy`: `uvicorn main:app --host 0.0.0.0 --port 7007`
4) Open the printed URL and click “Load Demo Scene”. Place assets under `public/assets/` to match `public/scenes/demo/scene.json`.
   - For first run without assets, the Point Cloud and Mesh panes spawn demo geometry.
   - Splats pane requires `@mkkellogg/gaussian-splats-3d` to be installed and valid .ply path.
   - NeRF pane expects a server at `http://localhost:7007` that responds to `/render?px=...&...` with an image.

View Sync
- The driver viewport publishes `CameraPose` over an in-app `CameraBus`.
- Followers apply pose updates. The NeRF pane pulls images from the server when the pose changes.

Scene Config
- See `public/scenes/demo/scene.json` for the schema (paths are relative to `public/`).
 - The demo scene references `/assets/demo_cloud.ply` (auto-generated) and `/assets/demo_mesh.glb` (downloaded). If the GLB download fails due to network, the Mesh pane will still show demo geometry.

Backend: NeRF Proxy (server/nerf-proxy)
- Minimal FastAPI app that accepts camera pose and returns a PNG rendered by Nerfstudio.
- Two integration options:
  1) Wrap `ns-render` / `ns-train` viewer APIs using Nerfstudio Python API.
  2) Call out to a long-lived Nerfstudio viewer process and bridge via WebSocket.
 - For the built-in demo, the server auto-generates a tiny dataset under `server/nerf-proxy/demo_dataset/`:
   - `images/*.png` (synthetic cube from 8 viewpoints) + `cameras.json` (poses)
   - The `/render` endpoint returns the nearest input image to the requested pose (IBR baseline). If no dataset is present, it falls back to a procedural “volumetric” render.

Data Pipeline Summary (scripts/)
1) Video → frames: `ffmpeg -i input.mp4 -vf fps=2 frames/%05d.png`
2) COLMAP SfM + MVS → cameras + dense cloud
3) Point cloud LOD: PotreeConverter → web tiles
4) Mesh: Surface reconstruction (Poisson) + texture bake → glTF/GLB
5) Splats: Train 3DGS (official repo or gsplat) → .ply
6) NeRF: `ns-train <method>` then run proxy server for rendering

Notes
- Potree can be embedded or you can render small clouds using three.js Points + PLYLoader (default here).
- The Splats pane assumes client-side rendering via `@mkkellogg/gaussian-splats-3d`.
- For a “modern splat” track (3D-GRT/GUT), extend the NeRF proxy pattern: render server-side with your backend and stream frames.
 - The demo scene references generated assets. You can replace them with your own outputs when ready.
 - Gaussian Splats pane includes a working fallback point renderer (approximate) when a 3DGS PLY is not provided. Drop a 3DGS-format PLY at `/assets/demo_splats.ply` and set it in `scene.json` to use true splats.
