#!/usr/bin/env python3
"""
Generate a simple demo Gaussian Splat .ply file.
This creates a simple 3D scene (like a cube or sphere) using Gaussian splats.
"""
import struct
import numpy as np

def generate_demo_splat_ply(output_path: str, num_splats: int = 5000):
    """Generate a demo Gaussian splat PLY file with a simple 3D shape."""
    
    # Create splats in a cube/sphere arrangement
    np.random.seed(42)
    
    # Positions - create a torus knot shape
    t = np.linspace(0, 2 * np.pi, num_splats)
    p = 2
    q = 3
    r = 0.5
    R = 1.0
    
    x = (R + r * np.cos(q * t)) * np.cos(p * t)
    y = (R + r * np.cos(q * t)) * np.sin(p * t)
    z = r * np.sin(q * t)
    
    positions = np.stack([x, y, z], axis=1).astype(np.float32)
    
    # Add some noise to make it look more organic
    positions += np.random.randn(*positions.shape).astype(np.float32) * 0.05
    
    # Normals (pointing outward)
    normals = positions / (np.linalg.norm(positions, axis=1, keepdims=True) + 1e-8)
    normals = normals.astype(np.float32)
    
    # Colors (RGB) - gradient based on position
    colors = np.zeros((num_splats, 3), dtype=np.uint8)
    colors[:, 0] = np.clip((x + 1.5) / 3.0 * 255, 0, 255).astype(np.uint8)  # R
    colors[:, 1] = np.clip((y + 1.5) / 3.0 * 255, 0, 255).astype(np.uint8)  # G
    colors[:, 2] = np.clip((z + 1) / 2.0 * 255, 0, 255).astype(np.uint8)    # B
    
    # Opacity (alpha) - all opaque
    opacity = np.ones((num_splats, 1), dtype=np.float32)
    
    # Scale (log scale for Gaussians) - small uniform splats
    scale = np.ones((num_splats, 3), dtype=np.float32) * -3.0  # exp(-3) ≈ 0.05
    
    # Rotation (as quaternion) - no rotation, all identity quaternions
    rotation = np.zeros((num_splats, 4), dtype=np.float32)
    rotation[:, 0] = 1.0  # w component
    
    # Spherical harmonics (for view-dependent appearance) - all zeros for simple lambertian
    # SH degree 0: DC component (1 coefficient per channel = 3 total)
    # For simplicity, we'll use degree 0 only
    sh_dc = np.zeros((num_splats, 3), dtype=np.float32)
    # Convert RGB colors to SH DC component
    # SH_DC = (color / 255 - 0.5) / 0.28209479177387814
    C0 = 0.28209479177387814
    sh_dc[:, 0] = (colors[:, 0] / 255.0 - 0.5) / C0
    sh_dc[:, 1] = (colors[:, 1] / 255.0 - 0.5) / C0
    sh_dc[:, 2] = (colors[:, 2] / 255.0 - 0.5) / C0
    
    # Write PLY file
    with open(output_path, 'wb') as f:
        # PLY Header
        header = f"""ply
format binary_little_endian 1.0
element vertex {num_splats}
property float x
property float y
property float z
property float nx
property float ny
property float nz
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
"""
        f.write(header.encode('ascii'))
        
        # Write binary data
        for i in range(num_splats):
            # Position
            f.write(struct.pack('fff', positions[i, 0], positions[i, 1], positions[i, 2]))
            # Normal
            f.write(struct.pack('fff', normals[i, 0], normals[i, 1], normals[i, 2]))
            # SH DC (color)
            f.write(struct.pack('fff', sh_dc[i, 0], sh_dc[i, 1], sh_dc[i, 2]))
            # Opacity
            f.write(struct.pack('f', opacity[i, 0]))
            # Scale
            f.write(struct.pack('fff', scale[i, 0], scale[i, 1], scale[i, 2]))
            # Rotation (quaternion)
            f.write(struct.pack('ffff', rotation[i, 0], rotation[i, 1], rotation[i, 2], rotation[i, 3]))
    
    print(f"✓ Generated Gaussian splat with {num_splats} splats: {output_path}")

if __name__ == '__main__':
    import sys
    output = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/demo-splat.ply'
    generate_demo_splat_ply(output, num_splats=5000)
