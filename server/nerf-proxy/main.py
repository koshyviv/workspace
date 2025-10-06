from fastapi import FastAPI, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image
import io

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


def render_dummy(width: int = 960, height: int = 540, pose: Pose | None = None) -> bytes:
    # Placeholder: render a simple gradient with pose-encoded text
    img = np.zeros((height, width, 3), dtype=np.uint8)
    gx = np.linspace(0, 255, width, dtype=np.uint8)
    gy = np.linspace(0, 255, height, dtype=np.uint8)
    img[..., 0] = gy[:, None]
    img[..., 1] = gx[None, :]
    img[..., 2] = 32
    pil = Image.fromarray(img, mode="RGB")
    # Optional: draw pose text if PIL ImageDraw available
    try:
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(pil)
        text = f"pos=({pose.px:.2f},{pose.py:.2f},{pose.pz:.2f}) fov={pose.fov:.1f}"
        draw.text((10, 10), text, fill=(255, 255, 255))
    except Exception:
        pass
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
    png = render_dummy(w, h, pose)
    return Response(content=png, media_type="image/png")


# Run: uvicorn main:app --host 0.0.0.0 --port 7007

