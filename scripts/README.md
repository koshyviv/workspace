Data Prep Pipeline (Automatable)

Inputs per scene
- Images: frames from video or photos (e.g., `frames/%05d.png`)
- COLMAP camera poses (sparse + dense)

Outputs
- Point cloud: PLY (optionally Potree LOD tiles)
- Mesh: GLB/GLTF with textures
- Splats: 3DGS .ply
- NeRF: Nerfstudio checkpoint (for server) or baked client assets

Steps
1) Extract frames
   ffmpeg -i input.mp4 -vf fps=2 frames/%05d.png

2) COLMAP SfM + MVS
   colmap feature_extractor --database_path db.db --image_path frames
   colmap exhaustive_matcher --database_path db.db
   mkdir sparse && colmap mapper --database_path db.db --image_path frames --output_path sparse
   mkdir dense && colmap image_undistorter --image_path frames --input_path sparse/0 --output_path dense --output_type COLMAP
   colmap patch_match_stereo --workspace_path dense --workspace_format COLMAP --PatchMatchStereo.geom_consistency true
   colmap stereo_fusion --workspace_path dense --workspace_format COLMAP --input_type geometric --output_path dense/fused.ply

3) Point cloud LOD (Potree)
   PotreeConverter dense/fused.ply -o potree_out --generate-page potree

4) Mesh reconstruction + texture (Poisson/Screened)
   poissonrecon --in dense/fused.ply --out mesh.ply --depth 10
   texrecon (or other texturing) → mesh_textured.obj → convert to GLB/GLTF

5) Gaussian Splats (3DGS)
   python train.py -s frames -m out/scene --eval
   # export splats
   python convert.py --ckpt out/scene/ckpt.npz --out out/scene/point_cloud.ply

6) Nerfstudio (NeRF)
   ns-train nerfacto --data frames --output-dir ns_out
   # run viewer server (alternatively integrate via API)
   ns-viewer --load-config ns_out/config.yml

7) Publish assets
   - Copy GLB/GLTF to web `public/assets/scene.glb`
   - Copy PLY to web `public/assets/scene_cloud.ply` and `public/assets/scene_splats.ply`
   - Update `public/scenes/<name>/scene.json`

Notes
- Use decimation/simplification for mesh (e.g., quadric decimation) and point cloud (voxel downsample) to keep sizes web-friendly.
- Potree tiles are best for very large clouds; the app can detect and embed Potree if provided.

