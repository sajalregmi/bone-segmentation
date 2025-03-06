# -*- coding: utf-8 -*-
"""
Created on Fri Feb  7 15:39:46 2025

@author: sregmi7
"""
# !pip install pydicom trimesh
# !pip install pyvista

import os
import pydicom
import numpy as np
from skimage.measure import marching_cubes
import matplotlib.pyplot as plt
from scipy.ndimage import binary_closing, gaussian_filter


try:
    import trimesh
    from trimesh.smoothing import filter_taubin

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
        arr_binary = (arr > 1024).astype(np.float32)  # This is where the mistake might be
        volume_3d[i] = arr_binary

  
    # volume_3d = binary_closing(volume_3d, structure=np.ones((3,3,3)))
    # volume_3d_blur = gaussian_filter(volume_3d, sigma=1.0)
    # volume_3d_smooth = (volume_3d_blur > 0.5).astype(np.float32)
    

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
                                               spacing=spacing,
                                               step_size=1)
    print(f"Mesh: {len(verts)} vertices, {len(faces)} faces")


    # Optional: save STL
    if HAS_TRIMESH and save_stl:
        mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=norms)
        filter_taubin(mesh, lamb=0.3, nu=-0.32, iterations=3)
        mesh.export(save_stl)
        mesh.show()
        print(f"Saved STL: {save_stl}")
    elif save_stl:
        print("Install trimesh if you want STL export.")

def main():
    segmented_folder = "Ankle_Segmented"  # your segmented output
    reconstruct_3d(segmented_folder, iso_level=0.5, save_stl="my_bone_model.stl")

if __name__ == "__main__":
    main()
