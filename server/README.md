NeRF Proxy Server

Purpose
- Accepts camera pose from the web client and returns a rendered frame, enabling synchronized side-by-side comparison.

Run
1) Create a virtualenv and install requirements:
   python -m venv .venv && source .venv/bin/activate
   pip install -r nerf-proxy/requirements.txt
2) Start server (from this directory):
   uvicorn main:app --host 0.0.0.0 --port 7007

Integrating Nerfstudio
- Replace `render_dummy` with real rendering via Nerfstudio:
  - Option A: Load a trained model via Nerfstudio Python API and render given extrinsics/intrinsics.
  - Option B: Bridge to a running `ns-viewer` process and request frames.
- Return a PNG (`image/png`) to the client. Ensure CORS headers allow the web app to fetch from your host.

API
- GET /render?px=&py=&pz=&tx=&ty=&tz=&ux=&uy=&uz=&fov=&w=&h=
  - Returns a PNG image rendered at `w`x`h` pixels for the given camera pose.
