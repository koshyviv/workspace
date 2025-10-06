from fastapi import FastAPI, Response, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image
import io
from pathlib import Path
import json
import math

app = FastAPI(title="NeRF Proxy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Pose(BaseModel):
    px: float
    py: float
    pz: float
    tx: float
    ty: float
    tz: float
    ux: float
    uy: float
    uz: float
    fov: float


# In-memory demo dataset (filled on startup)
DEMO = {
    "images": [],  # list[Image.Image]
    "cameras": [], # list[dict]
}


def ensure_demo_dataset() -> None:
    """Generate a tiny synthetic dataset (cube) and publish assets for the web app.
    - Saves input images + cameras JSON in server/nerf-proxy/demo_dataset/
    - Saves a point cloud PLY under public/assets/demo_cloud.ply
    - Downloads a tiny Box.glb as the mesh under public/assets/demo_mesh.glb (if not present)
    """
    root = Path(__file__).resolve().parents[2]  # repo root
    server_dir = Path(__file__).resolve().parent
    public_assets = root / "public" / "assets"
    public_assets.mkdir(parents=True, exist_ok=True)
    demo_dir = server_dir / "demo_dataset"
    demo_images = demo_dir / "images"
    demo_images.mkdir(parents=True, exist_ok=True)

    # Camera parameters
    W, H = 320, 240
    fov = 60.0
    cams = []
    imgs = []

    # Define cube vertices and faces (12 triangles)
    verts = np.array([
        [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],  # back
        [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1],  # front
    ], dtype=np.float32)
    faces = [
        (0,1,2),(0,2,3),   # back
        (4,6,5),(4,7,6),   # front
        (0,4,5),(0,5,1),   # bottom
        (3,2,6),(3,6,7),   # top
        (0,3,7),(0,7,4),   # left
        (1,5,6),(1,6,2),   # right
    ]
    face_colors = [
        (200,60,60),(200,60,60),
        (60,200,60),(60,200,60),
        (60,60,200),(60,60,200),
        (220,180,60),(220,180,60),
        (200,60,200),(200,60,200),
        (60,200,200),(60,200,200),
    ]

    def look_at(pos, target, up):
        f = target - pos
        f = f / (np.linalg.norm(f) + 1e-8)
        r = np.cross(f, up)
        r = r / (np.linalg.norm(r) + 1e-8)
        u = np.cross(r, f)
        return r, u, f

    def project(p, r, u, f, pos, fov_deg, W, H):
        rel = p - pos
        z = np.dot(rel, f)
        if z <= 0: return None
        x_cam = np.dot(rel, r) / z
        y_cam = np.dot(rel, u) / z
        fov_rad = math.radians(fov_deg)
        aspect = W / H
        sx = int((x_cam / math.tan(fov_rad/2) / aspect + 1) * W/2)
        sy = int((-y_cam / math.tan(fov_rad/2) + 1) * H/2)
        return sx, sy, z

    # Render N views around the cube
    N = 8
    radius = 3.0
    for i in range(N):
        ang = i * (2*math.pi/N)
        elev = math.radians(20)
        pos = np.array([radius*math.cos(ang), radius*math.sin(elev), radius*math.sin(ang)], dtype=np.float32)
        target = np.array([0,0,0], dtype=np.float32)
        up = np.array([0,1,0], dtype=np.float32)
        r,u,fv = look_at(pos, target, up)
        # Painter's algorithm: sort triangles by depth
        tri_info = []
        for (a,b,c), col in zip(faces, face_colors):
            pa, pb, pc = verts[a], verts[b], verts[c]
            # center depth
            center = (pa+pb+pc)/3
            prj = [project(pa,r,u,fv,pos,fov,W,H), project(pb,r,u,fv,pos,fov,W,H), project(pc,r,u,fv,pos,fov,W,H)]
            if any(p is None for p in prj):
                continue
            depth = np.dot(center - pos, fv)
            tri_info.append((depth, prj, col))
        tri_info.sort(reverse=True)  # far to near
        canvas = np.zeros((H,W,3), dtype=np.uint8)
        canvas[:,:,:] = (11,14,18)  # background
        for _, ((x0,y0,_),(x1,y1,_),(x2,y2,_)), col in tri_info:
            # rasterize filled triangle (naive)
            minx = max(0, min(x0,x1,x2))
            maxx = min(W-1, max(x0,x1,x2))
            miny = max(0, min(y0,y1,y2))
            maxy = min(H-1, max(y0,y1,y2))
            area = (x1-x0)*(y2-y0) - (y1-y0)*(x2-x0)
            if area == 0: continue
            for y in range(miny, maxy+1):
                for x in range(minx, maxx+1):
                    w0 = (x1-x0)*(y-y0) - (y1-y0)*(x-x0)
                    w1 = (x2-x1)*(y-y1) - (y2-y1)*(x-x1)
                    w2 = (x0-x2)*(y-y2) - (y0-y2)*(x-x2)
                    if (w0 >= 0 and w1 >= 0 and w2 >= 0) or (w0 <= 0 and w1 <= 0 and w2 <= 0):
                        canvas[y,x] = col
        pil = Image.fromarray(canvas, mode="RGB")
        imgs.append(pil)
        cams.append({
            "position": pos.tolist(),
            "target": target.tolist(),
            "up": up.tolist(),
            "fov": fov,
            "size": [W,H],
        })
        pil.save(demo_images / f"{i:03d}.png")
    # Save cameras
    (demo_dir / "cameras.json").write_text(json.dumps(cams, indent=2))

    # Also provide a small point cloud PLY under public/assets
    # Sample points on cube faces
    rng = np.random.default_rng(42)
    pts = []
    cols = []
    for fi, ((a,b,c), col) in enumerate(zip(faces, face_colors)):
        pa, pb, pc = verts[a], verts[b], verts[c]
        # sample 60 points per triangle
        for _ in range(60):
            u1, u2 = rng.random(), rng.random()
            if u1 + u2 > 1:
                u1, u2 = 1-u1, 1-u2
            p = pa + u1*(pb-pa) + u2*(pc-pa)
            pts.append(p)
            cols.append(col)
    pts = np.array(pts)
    cols = np.array(cols)
    # Write ASCII PLY
    ply_path = public_assets / "demo_cloud.ply"
    with open(ply_path, 'w') as f:
        f.write("ply\nformat ascii 1.0\n")
        f.write(f"element vertex {len(pts)}\n")
        f.write("property float x\nproperty float y\nproperty float z\n")
        f.write("property uchar red\nproperty uchar green\nproperty uchar blue\n")
        f.write("end_header\n")
        for (x,y,z),(r,g,b) in zip(pts, cols):
            f.write(f"{x:.5f} {y:.5f} {z:.5f} {int(r)} {int(g)} {int(b)}\n")

    # Download Box.glb if missing
    glb_path = public_assets / "demo_mesh.glb"
    if not glb_path.exists():
        try:
            import urllib.request
            url = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb"
            urllib.request.urlretrieve(url, glb_path)
        except Exception:
            # If download fails, leave mesh absent; frontend will show demo geometry
            pass

    # Load images in-memory for serving
    DEMO["images"] = imgs
    DEMO["cameras"] = cams


def render_dummy(width: int = 960, height: int = 540, pose: Pose | None = None) -> bytes:
    """Render a simple synthetic view of a torus knot matching the demo scene."""
    # Create background gradient
    img = np.ones((height, width, 3), dtype=np.float32) * 0.043  # Dark background #0b0e12
    
    if pose:
        # Camera setup
        cam_pos = np.array([pose.px, pose.py, pose.pz])
        target = np.array([pose.tx, pose.ty, pose.tz])
        up = np.array([pose.ux, pose.uy, pose.uz])
        
        # View matrix
        forward = target - cam_pos
        forward = forward / (np.linalg.norm(forward) + 1e-8)
        right = np.cross(forward, up)
        right = right / (np.linalg.norm(right) + 1e-8)
        up_corrected = np.cross(right, forward)
        
        # Generate torus knot points
        num_samples = 500
        for i in range(num_samples):
            t = (i / num_samples) * 2 * np.pi
            p, q = 2, 3
            r, R = 0.5, 1.0
            
            # 3D position
            x = (R + r * np.cos(q * t)) * np.cos(p * t)
            y = (R + r * np.cos(q * t)) * np.sin(p * t)
            z = r * np.sin(q * t)
            point = np.array([x, y, z])
            
            # Project to screen
            rel = point - cam_pos
            depth = np.dot(rel, forward)
            if depth < 0.1:
                continue
            
            # Perspective projection
            x_cam = np.dot(rel, right) / depth
            y_cam = np.dot(rel, up_corrected) / depth
            fov_rad = np.radians(pose.fov)
            aspect = width / height
            
            sx = int((x_cam / np.tan(fov_rad / 2) / aspect + 1) * width / 2)
            sy = int((-y_cam / np.tan(fov_rad / 2) + 1) * height / 2)
            
            if 0 <= sx < width and 0 <= sy < height:
                # Color based on position (same gradient as other viewers)
                cr = (x + 1.5) / 3.0
                cg = (y + 1.5) / 3.0
                cb = (z + 1) / 2.0
                
                # Draw with soft edges (simulate volumetric rendering)
                size = max(2, int(5 / depth))
                for dx in range(-size, size+1):
                    for dy in range(-size, size+1):
                        px, py = sx + dx, sy + dy
                        if 0 <= px < width and 0 <= py < height:
                            dist = np.sqrt(dx*dx + dy*dy)
                            alpha = max(0, 1 - dist / size) * 0.8
                            img[py, px] = img[py, px] * (1 - alpha) + np.array([cr, cg, cb]) * alpha
    
    # Convert to uint8 and create image
    img = np.clip(img * 255, 0, 255).astype(np.uint8)
    pil = Image.fromarray(img, mode="RGB")
    
    # Add info text
    try:
        from PIL import ImageDraw
        draw = ImageDraw.Draw(pil)
        text = f"NeRF: pos=({pose.px:.1f},{pose.py:.1f},{pose.pz:.1f})"
        draw.text((10, 10), text, fill=(180, 180, 180))
    except Exception:
        pass
    
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


def render_nearest_view(width: int, height: int, pose: Pose) -> bytes | None:
    if not DEMO["images"]:
        return None
    cam_pos = np.array([pose.px, pose.py, pose.pz])
    best_i, best_d = -1, 1e9
    for i, cam in enumerate(DEMO["cameras"]):
        pos = np.array(cam["position"])
        d = float(np.linalg.norm(pos - cam_pos))
        if d < best_d:
            best_d, best_i = d, i
    if best_i < 0:
        return None
    pil = DEMO["images"][best_i]
    if pil.size != (width, height):
        pil = pil.resize((width, height), Image.BICUBIC)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return buf.getvalue()


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/render")
def render(
    px: float = Query(...),
    py: float = Query(...),
    pz: float = Query(...),
    tx: float = Query(...),
    ty: float = Query(...),
    tz: float = Query(...),
    ux: float = Query(0),
    uy: float = Query(1),
    uz: float = Query(0),
    fov: float = Query(60),
    w: int = Query(960),
    h: int = Query(540),
):
    pose = Pose(px=px, py=py, pz=pz, tx=tx, ty=ty, tz=tz, ux=ux, uy=uy, uz=uz, fov=fov)
    # TODO: Integrate with Nerfstudio viewer or API here.
    # - Option A: spawn a persistent ns-viewer and send camera pose via websocket/HTTP
    # - Option B: load ns model via Python API and render directly
    # Prefer dataset nearest-view if available, fallback to analytic renderer
    png = render_nearest_view(w, h, pose)
    if png is None:
        png = render_dummy(w, h, pose)
    return Response(content=png, media_type="image/png")


@app.on_event("startup")
def _on_start():
    # Create small demo dataset and publish assets
    ensure_demo_dataset()


@app.get("/inputs")
def list_inputs():
    cams = DEMO["cameras"]
    return {"count": len(cams), "cameras": cams}


@app.get("/inputs/image/{idx}")
def get_input_image(idx: int, w: int | None = None, h: int | None = None):
    if not DEMO["images"]:
        raise HTTPException(404, "No demo images")
    if idx < 0 or idx >= len(DEMO["images"]):
        raise HTTPException(404, "Index out of range")
    pil = DEMO["images"][idx]
    if w and h:
        pil = pil.resize((int(w), int(h)), Image.BICUBIC)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")

# Run: uvicorn main:app --host 0.0.0.0 --port 7007
