#!/usr/bin/env python3
"""
Generate a demo point cloud .ply file.
Creates the same shape as the Gaussian splats for comparison.
"""
import struct
import numpy as np

def generate_demo_pointcloud_ply(output_path: str, num_points: int = 10000):
    """Generate a demo point cloud PLY file with the same torus knot shape."""
    
    np.random.seed(42)
    
    # Positions - create a torus knot shape (same as splats)
    t = np.linspace(0, 2 * np.pi, num_points)
    p = 2
    q = 3
    r = 0.5
    R = 1.0
    
    x = (R + r * np.cos(q * t)) * np.cos(p * t)
    y = (R + r * np.cos(q * t)) * np.sin(p * t)
    z = r * np.sin(q * t)
    
    positions = np.stack([x, y, z], axis=1).astype(np.float32)
    positions += np.random.randn(*positions.shape).astype(np.float32) * 0.05
    
    # Colors (RGB) - same gradient as splats
    colors = np.zeros((num_points, 3), dtype=np.uint8)
    colors[:, 0] = np.clip((x + 1.5) / 3.0 * 255, 0, 255).astype(np.uint8)
    colors[:, 1] = np.clip((y + 1.5) / 3.0 * 255, 0, 255).astype(np.uint8)
    colors[:, 2] = np.clip((z + 1) / 2.0 * 255, 0, 255).astype(np.uint8)
    
    # Write PLY file
    with open(output_path, 'wb') as f:
        header = f"""ply
format binary_little_endian 1.0
element vertex {num_points}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
"""
        f.write(header.encode('ascii'))
        
        # Write binary data
        for i in range(num_points):
            f.write(struct.pack('fff', positions[i, 0], positions[i, 1], positions[i, 2]))
            f.write(struct.pack('BBB', colors[i, 0], colors[i, 1], colors[i, 2]))
    
    print(f"✓ Generated point cloud with {num_points} points: {output_path}")

if __name__ == '__main__':
    import sys
    output = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/demo-pointcloud.ply'
    generate_demo_pointcloud_ply(output, num_points=10000)
