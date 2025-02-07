# -*- coding: utf-8 -*-
"""
Created on Fri Feb  7 15:39:46 2025

@author: sregmi7
"""

import os
import pydicom
import numpy as np
from skimage.measure import marching_cubes
import matplotlib.pyplot as plt

try:
    import trimesh
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False

def load_segmented_slices(folder_path):
    """
    Loads DICOM slices from your segmented folder and sorts by InstanceNumber.
    These DICOMs have bone in [some positive range], background = 0.
    Returns a list of (pydicom datasets).
    """
    dcm_files = [os.path.join(folder_path, f) 
                 for f in os.listdir(folder_path) 
                 if f.lower().endswith(".dcm")]
    if not dcm_files:
        raise FileNotFoundError(f"No .dcm found in {folder_path}")

    def get_instance_number(fp):
        ds = pydicom.dcmread(fp, stop_before_pixels=True)
        return int(ds.InstanceNumber) if 'InstanceNumber' in ds else 0

    dcm_files.sort(key=get_instance_number)
    datasets = [pydicom.dcmread(fp) for fp in dcm_files]
    return datasets

def reconstruct_3d(folder_path, iso_level=0.5, save_stl=None):
    """
    1) Reads your 'segmented' DICOM slices (where outside bone=0, inside bone>0).
    2) Binarizes them to {0,1}.
    3) Applies marching cubes to get a 3D mesh.
    4) (Optional) Saves to STL if 'save_stl' is provided.
    """
    datasets = load_segmented_slices(folder_path)
    if not datasets:
        print("No datasets found.")
        return

    # Gather volume shape
    first_ds = datasets[0]
    rows, cols = first_ds.pixel_array.shape
    num_slices = len(datasets)

    volume_3d = np.zeros((num_slices, rows, cols), dtype=np.float32)
    

    for i, ds in enumerate(datasets):
        arr = ds.pixel_array.astype(np.float32)
        print("ARRAY MIN", arr.min(), "ARRAY MAX", arr.max())
        # Check how many non-zero pixels exist
        num_nonzero = np.count_nonzero(arr)
        print(f"Slice {i}: Non-zero pixels = {num_nonzero}/{arr.size}")
        # Convert to binary: 1 for bone, 0 for background
        arr_binary = (arr > 1024).astype(np.float32)  # This is where the mistake might be
        volume_3d[i] = arr_binary

        
    volume_min = volume_3d.min()
    volume_max = volume_3d.max()
    print("After loading volume:")
    print("  min =", volume_min, " max =", volume_max)
    if volume_max <= 0:
        print("No positive voxels found in the volume! Check segmentation or directory.")
    

    # Get spacing from metadata (SliceThickness & PixelSpacing)
    try:
        dz = float(first_ds.SliceThickness)
    except:
        dz = float(first_ds.SpacingBetweenSlices)
    dy, dx = [float(val) for val in first_ds.PixelSpacing]
    spacing = (dz, dy, dx)

    # Marching cubes
    verts, faces, norms, vals = marching_cubes(volume_3d, 
                                               level=iso_level, 
                                               spacing=spacing)
    print(f"Mesh: {len(verts)} vertices, {len(faces)} faces")

    # Optional: save STL
    if save_stl and HAS_TRIMESH:
        mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=norms)
        mesh.export(save_stl)
        print(f"Saved STL: {save_stl}")
    elif save_stl:
        print("Install trimesh if you want STL export.")

    # Quick point cloud preview in matplotlib
    x, y, z = verts.T
    fig = plt.figure()
    ax = fig.add_subplot(projection='3d')
    ax.scatter(x, y, z, s=0.3, alpha=0.3)
    plt.title("3D Reconstruction from Segmented DICOMs")
    plt.show()

def main():
    segmented_folder = "DICOM_IMAGES/ANKLE_SEGMENTED"  # your segmented output
    reconstruct_3d(segmented_folder, iso_level=0.5, save_stl="my_bone_model.stl")

if __name__ == "__main__":
    main()
