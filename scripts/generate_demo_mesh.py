#!/usr/bin/env python3
"""
Generate a demo mesh GLTF file.
Creates the same torus knot shape for comparison.
"""
import json
import struct
import numpy as np
from pathlib import Path

def generate_demo_mesh_gltf(output_path: str):
    """Generate a demo mesh GLTF file with torus knot shape."""
    
    np.random.seed(42)
    
    # Generate torus knot
    u_res = 100
    v_res = 20
    p = 2
    q = 3
    r = 0.3
    R = 1.0
    
    vertices = []
    normals = []
    colors = []
    indices = []
    
    for i in range(u_res):
        u = 2 * np.pi * i / u_res
        for j in range(v_res):
            v = 2 * np.pi * j / v_res
            
            # Torus knot surface
            x = (R + r * np.cos(v)) * np.cos(u * p) * np.cos(v)
            y = (R + r * np.cos(v)) * np.sin(u * p) * np.cos(v)
            z = r * np.sin(v) + r * np.sin(u * q)
            
            vertices.extend([x, y, z])
            
            # Simple normal (pointing outward)
            nx, ny, nz = np.cos(v) * np.cos(u * p), np.cos(v) * np.sin(u * p), np.sin(v)
            norm = np.sqrt(nx*nx + ny*ny + nz*nz) + 1e-8
            normals.extend([nx/norm, ny/norm, nz/norm])
            
            # Color gradient
            cr = (x + 1.5) / 3.0
            cg = (y + 1.5) / 3.0
            cb = (z + 1) / 2.0
            colors.extend([cr, cg, cb, 1.0])
    
    # Generate indices for triangle mesh
    for i in range(u_res - 1):
        for j in range(v_res - 1):
            v0 = i * v_res + j
            v1 = i * v_res + (j + 1)
            v2 = (i + 1) * v_res + j
            v3 = (i + 1) * v_res + (j + 1)
            
            indices.extend([v0, v2, v1, v1, v2, v3])
    
    # Convert to numpy arrays
    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    colors = np.array(colors, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint16)
    
    # Create binary buffer
    buffer_data = bytearray()
    buffer_data.extend(vertices.tobytes())
    buffer_data.extend(normals.tobytes())
    buffer_data.extend(colors.tobytes())
    buffer_data.extend(indices.tobytes())
    
    # Calculate offsets
    vertex_offset = 0
    normal_offset = len(vertices.tobytes())
    color_offset = normal_offset + len(normals.tobytes())
    index_offset = color_offset + len(colors.tobytes())
    
    # Create GLTF JSON
    gltf = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1,
                    "COLOR_0": 2
                },
                "indices": 3,
                "mode": 4
            }]
        }],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(vertices) // 3,
                "type": "VEC3",
                "max": [float(vertices[0::3].max()), float(vertices[1::3].max()), float(vertices[2::3].max())],
                "min": [float(vertices[0::3].min()), float(vertices[1::3].min()), float(vertices[2::3].min())]
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(normals) // 3,
                "type": "VEC3"
            },
            {
                "bufferView": 2,
                "componentType": 5126,
                "count": len(colors) // 4,
                "type": "VEC4"
            },
            {
                "bufferView": 3,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR"
            }
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": vertex_offset, "byteLength": len(vertices.tobytes()), "target": 34962},
            {"buffer": 0, "byteOffset": normal_offset, "byteLength": len(normals.tobytes()), "target": 34962},
            {"buffer": 0, "byteOffset": color_offset, "byteLength": len(colors.tobytes()), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(indices.tobytes()), "target": 34963}
        ],
        "buffers": [{
            "uri": "demo-mesh.bin",
            "byteLength": len(buffer_data)
        }]
    }
    
    # Write files
    output_path = Path(output_path)
    bin_path = output_path.with_suffix('.bin')
    
    with open(output_path, 'w') as f:
        json.dump(gltf, f, indent=2)
    
    with open(bin_path, 'wb') as f:
        f.write(buffer_data)
    
    print(f"✓ Generated mesh: {output_path} and {bin_path}")

if __name__ == '__main__':
    import sys
    output = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/demo-mesh.gltf'
    generate_demo_mesh_gltf(output)
