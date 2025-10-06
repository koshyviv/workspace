import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'

const root = process.cwd()
const assetsDir = path.join(root, 'public', 'assets')
fs.mkdirSync(assetsDir, { recursive: true })

function writePLYCubePoints(filepath) {
  const verts = [
    [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
    [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1],
  ]
  const faces = [
    [0,1,2],[0,2,3], [4,6,5],[4,7,6], [0,4,5],[0,5,1], [3,2,6],[3,6,7], [0,3,7],[0,7,4], [1,5,6],[1,6,2],
  ]
  const faceColors = [
    [200,60,60],[200,60,60], [60,200,60],[60,200,60], [60,60,200],[60,60,200], [220,180,60],[220,180,60], [200,60,200],[200,60,200], [60,200,200],[60,200,200]
  ]
  const rng = (seed => () => (seed = (seed*1664525+1013904223)%4294967296)/4294967296)(42)
  const pts = []
  const cols = []
  for (let i=0; i<faces.length; i++) {
    const [a,b,c] = faces[i]
    const col = faceColors[i]
    const pa = verts[a], pb = verts[b], pc = verts[c]
    for (let k=0;k<60;k++) {
      let u1 = rng(), u2 = rng()
      if (u1 + u2 > 1) { u1 = 1-u1; u2 = 1-u2 }
      const p = [
        pa[0] + u1*(pb[0]-pa[0]) + u2*(pc[0]-pa[0]),
        pa[1] + u1*(pb[1]-pa[1]) + u2*(pc[1]-pa[1]),
        pa[2] + u1*(pb[2]-pa[2]) + u2*(pc[2]-pa[2]),
      ]
      pts.push(p)
      cols.push(col)
    }
  }
  let out = ''
  out += 'ply\nformat ascii 1.0\n'
  out += `element vertex ${pts.length}\n`
  out += 'property float x\nproperty float y\nproperty float z\n'
  out += 'property uchar red\nproperty uchar green\nproperty uchar blue\n'
  out += 'end_header\n'
  for (let i=0;i<pts.length;i++) {
    const [x,y,z] = pts[i]
    const [r,g,b] = cols[i]
    out += `${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)} ${r} ${g} ${b}\n`
  }
  fs.writeFileSync(filepath, out)
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode && res.statusCode >= 400) {
        file.close(); fs.rmSync(dest, { force: true }); return reject(new Error(`HTTP ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => {
      file.close(); fs.rmSync(dest, { force: true }); reject(err)
    })
  })
}

const plyPath = path.join(assetsDir, 'demo_cloud.ply')
if (!fs.existsSync(plyPath)) {
  console.log('[assets] Writing demo_cloud.ply')
  writePLYCubePoints(plyPath)
}

const glbPath = path.join(assetsDir, 'demo_mesh.glb')
if (!fs.existsSync(glbPath)) {
  try {
    console.log('[assets] Downloading demo_mesh.glb')
    await download('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb', glbPath)
  } catch (e) {
    console.warn('[assets] Failed to download demo_mesh.glb; mesh pane will show demo geometry')
  }
}

console.log('[assets] Done')

