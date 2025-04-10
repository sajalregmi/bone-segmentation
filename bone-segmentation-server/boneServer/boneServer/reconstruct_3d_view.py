import os
import json
import shutil

import numpy as np
import pydicom
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import jwt as pyjwt
from django.conf import settings
from django.contrib.auth.models import User
from scipy.ndimage import binary_closing, gaussian_filter
from .models import SegmentationRecord
from skimage.measure import marching_cubes

try:
    import trimesh
    from trimesh.smoothing import filter_taubin
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False

def decode_jwt_token(request):
    """
    Decodes the JWT from the Authorization header.
    Returns the user object if valid, otherwise None.
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', None)
    if not auth_header:
        return None, "Missing Authorization header"

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None, "Invalid Authorization header format"

    token = parts[1]
    try:
        payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("id")
        user = User.objects.get(id=user_id)
        return user, None
    except pyjwt.ExpiredSignatureError:
        return None, "Token has expired"
    except (pyjwt.DecodeError, User.DoesNotExist):
        return None, "Invalid token"

@csrf_exempt
def reconstruct_3d_view(request, segmentation_id):
    """
    POST /reconstruct-3d/<segmentation_id>/
    Body: { "iso_level": 0.5 }  # optional

    - Reconstructs a 3D STL model from segmented DICOMs
    - Saves STL in MEDIA_ROOT/stl_models/
    - Stores URL path in SegmentationRecord.three_d_model_path
    - Returns JSON with the model's HTTP-accessible URL
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)
    if not current_user.userprofile.role.lower() == "physician":
        return JsonResponse({"error": "Only physicians can reconstruct 3D."}, status=403)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        data = {}
    iso_level = float(data.get("iso_level", 0.5))

    try:
        seg_record = SegmentationRecord.objects.get(id=segmentation_id)
    except SegmentationRecord.DoesNotExist:
        return JsonResponse({"error": "Segmentation record not found"}, status=404)

    segmented_folder = seg_record.output_folder_path
    if not os.path.isdir(segmented_folder):
        return JsonResponse({"error": f"Segmented folder not found: {segmented_folder}"}, status=400)

    timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
    stl_filename = f"3D_model_{seg_record.id}_{timestamp_str}.stl"
    stl_dir = os.path.join(settings.MEDIA_ROOT, 'stl_models')
    os.makedirs(stl_dir, exist_ok=True)
    stl_path = os.path.join(stl_dir, stl_filename)

    if seg_record.three_d_model_path:
        old_stl = os.path.join(settings.MEDIA_ROOT, seg_record.three_d_model_path.replace(settings.MEDIA_URL, ""))
        if os.path.exists(old_stl):
            os.remove(old_stl)


    success, msg = do_3d_reconstruction(segmented_folder, iso_level, stl_path)
    if not success:
        return JsonResponse({"error": msg}, status=500)

    stl_web_url = f"{settings.MEDIA_URL}stl_models/{stl_filename}"
    seg_record.three_d_model_path = stl_web_url
    seg_record.save()

    return JsonResponse({
        "message": "3D reconstruction completed",
        "three_d_model_url": stl_web_url,
    }, status=200)



def do_3d_reconstruction(folder_path, iso_level, save_stl):
    """
    Calls your existing reconstruction logic.
    Returns (True, "success_message") or (False, "error_message")
    """
    if not HAS_TRIMESH:
        return (False, "trimesh not installed. Please install it to save STL.")
    if not os.path.exists(folder_path):
        return (False, f"Folder does not exist: {folder_path}")

    try:
        dcm_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.lower().endswith(".dcm")]
        if not dcm_files:
            return (False, f"No DICOM files found in {folder_path}")
        def get_instance_number(fp):
            ds = pydicom.dcmread(fp, stop_before_pixels=True)
            return int(ds.InstanceNumber) if 'InstanceNumber' in ds else 0
        dcm_files.sort(key=get_instance_number)
        datasets = [pydicom.dcmread(fp) for fp in dcm_files]
        first_ds = datasets[0]
        rows, cols = first_ds.pixel_array.shape
        num_slices = len(datasets)

        volume_3d = np.zeros((num_slices, rows, cols), dtype=np.float32)
        for i, ds in enumerate(datasets):
            arr = ds.pixel_array.astype(np.float32)
            print("ARRAY MIN:", arr.min(), "MAX:", arr.max())
            arr_binary = (arr > 1).astype(np.float32)
            volume_3d[i] = arr_binary
        
        volume_3d = binary_closing(volume_3d, structure=np.ones((1, 1, 1)))
            
        try:
            dz = float(first_ds.SliceThickness)
        except:
            dz = float(first_ds.SpacingBetweenSlices)
        dy, dx = [float(val) for val in first_ds.PixelSpacing]
        spacing = (dz, dy, dx)
        verts, faces, norms, vals = marching_cubes(volume_3d, 
                                                   level=iso_level, 
                                                   spacing=spacing,
                                                   step_size=1)
        
        mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=norms)
        components = mesh.split(only_watertight=False)
        largest_component = max(components, key=lambda m: m.area)
        filter_taubin(largest_component, lamb=0.5, nu=-0.53, iterations=10)
        largest_component.export(save_stl)
        return (True, f"STL saved to {save_stl}")
    except Exception as e:
        return (False, str(e))
