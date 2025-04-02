import json
import datetime
import os
import pydicom
import numpy as np
import cv2
import datetime
import jwt as pyjwt
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import JsonResponse, FileResponse, Http404, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import UserProfile, SegmentationRecord
from django.utils import timezone
from io import BytesIO
import shutil


def convert_to_hu(dicom_data):
    """
    Convert DICOM pixel values to Hounsfield Units using RescaleSlope, RescaleIntercept.
    """
    image = dicom_data.pixel_array.astype(np.float64)
    intercept = getattr(dicom_data, 'RescaleIntercept', 0.0)
    slope = getattr(dicom_data, 'RescaleSlope', 1.0)

    if slope != 1:
        image *= slope
    image += intercept

    return image.astype(np.int16)

def segment_bone_hu(image_hu, lower_hu=300, upper_hu=2000):
    """
    1. Threshold HU into [lower_hu, upper_hu]
    2. Morphological closing to remove small holes
    3. Return segmented HU image
    """
    binary_mask = np.logical_and(image_hu >= lower_hu, image_hu <= upper_hu)
    binary_mask = (binary_mask * 255).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    segmented_bone = cv2.bitwise_and(image_hu, image_hu, mask=cleaned_mask)
    return segmented_bone

def decode_jwt_token(request):
    """
    Decodes the JWT from the Authorization header.
    Returns the user object if valid, otherwise None.
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', None)
    if not auth_header:
        return None, "Missing Authorization header"

    # Expecting header like: "Bearer <token>"
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
def signup(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    try:
        data = json.loads(request.body)
        username = data["username"]
        password = data["password"]
        role = data["role"].lower()  # expecting 'physician' or 'patient'
        if role not in ["physician", "patient"]:
            return JsonResponse({"error": "Invalid role"}, status=400)
    except (KeyError, json.JSONDecodeError):
        return JsonResponse({"error": "Missing or invalid fields"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "User already exists"}, status=400)

    user = User.objects.create_user(username=username, password=password)
    UserProfile.objects.create(user=user, role=role)
    return JsonResponse({"message": "User created successfully"}, status=201)

@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    try:
        data = json.loads(request.body)
        username = data["username"]
        password = data["password"]
    except (KeyError, json.JSONDecodeError):
        return JsonResponse({"error": "Missing or invalid fields"}, status=400)

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    try:
        user_profile = user.userprofile
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    payload = {
        "id": user.id,
        "username": user.username,
        "role": user_profile.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=10),
    }
    token = pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return JsonResponse({"access_token": token})


@csrf_exempt
def segment_images(request):
    """
    POST endpoint.
    Expects JSON (or multipart if needed) with:
    - folder_path (string): path to folder with DICOM files
    - lower_threshold (int): e.g. 300
    - upper_threshold (int): e.g. 2000
    - patient_email (string): the patient’s email
    Requires 'Authorization: Bearer <access_token>' header.

    Performs segmentation on all DICOMs in 'folder_path' and saves them
    in an output folder. Creates a SegmentationRecord in the DB.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)

    # Decode the JWT
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)

    # Check if user is physician
    try:
        if current_user.userprofile.role.lower() != "physician":
            return JsonResponse({"error": "Only physicians can perform segmentation."}, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    # Parse input data
    try:
        data = json.loads(request.body)
        folder_path = data["folder_path"]
        lower_threshold = int(data["lower_threshold"])
        upper_threshold = int(data["upper_threshold"])
        patient_email = data["patient_email"]
    except (KeyError, json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Missing or invalid fields"}, status=400)

    if not os.path.exists(folder_path):
        return JsonResponse({"error": f"Folder path does not exist: {folder_path}"}, status=400)

    # Create an output folder (you can rename or restructure as needed)
    timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
    output_folder = f"{folder_path}_segmented_{timestamp_str}"
    os.makedirs(output_folder, exist_ok=True)

    # Iterate over all .dcm files and segment
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.dcm'):
            dicom_filepath = os.path.join(folder_path, filename)
            ds = pydicom.dcmread(dicom_filepath)

            # Convert to HU and segment
            image_hu = convert_to_hu(ds)
            segmented_image = segment_bone_hu(image_hu, lower_hu=lower_threshold, upper_hu=upper_threshold)

            # Update the DICOM pixel data
            # Make sure to handle DICOM metadata like BitsStored if needed
            ds.PixelData = segmented_image.astype(np.int16).tobytes()

            # Save the new DICOM in the output folder
            output_path = os.path.join(output_folder, filename)
            ds.save_as(output_path)

    # Create a SegmentationRecord
    seg_record = SegmentationRecord.objects.create(
        physician=current_user,
        patient_email=patient_email,
        folder_path=folder_path,
        output_folder_path=output_folder,
        lower_threshold=lower_threshold,
        upper_threshold=upper_threshold
    )

    return JsonResponse({
        "message": "Segmentation completed successfully",
        "output_folder": output_folder,
        "segmentation_id": seg_record.id
    }, status=200)


############################
# Fetch Recent Scans
############################

@csrf_exempt
def get_scans(request):
    """
    GET endpoint for physicians to retrieve all their segmentation records.
    Requires 'Authorization: Bearer <access_token>' header.
    Returns JSON with data for each segmentation record.
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    # Decode the JWT
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)

    # Check if user is physician
    try:
        if current_user.userprofile.role.lower() != "physician":
            return JsonResponse({"error": "Only physicians can view scans."}, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    # Fetch all segmentations for this physician
    segmentations = SegmentationRecord.objects.filter(physician=current_user).order_by('-created_at')

    results = []
    for seg in segmentations:
        results.append({
            "segmentation_id": seg.id,
            "patient_email": seg.patient_email,
            "folder_path": seg.folder_path,
            "output_folder_path": seg.output_folder_path,
            "lower_threshold": seg.lower_threshold,
            "upper_threshold": seg.upper_threshold,
            "created_at": seg.created_at.isoformat(),
        })

    return JsonResponse({"segmentations": results}, status=200)


@csrf_exempt
def get_dicom_files(request, seg_id):
    """
    GET endpoint to list all .dcm files in the segmentation's absolute output folder.
    Example response:
      { "dicom_files": ["1.dcm", "2.dcm", "3.dcm"] }
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    # Decode JWT (reusing your existing decode_jwt_token function)
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)

    # Check if user is physician
    try:
        if current_user.userprofile.role.lower() != "physician":
            return JsonResponse({"error": "Only physicians can view scans."}, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    # Fetch the SegmentationRecord
    try:
        seg = SegmentationRecord.objects.get(id=seg_id, physician=current_user)
    except SegmentationRecord.DoesNotExist:
        return JsonResponse({"error": "Segmentation not found"}, status=404)

    absolute_folder = seg.output_folder_path  # Already stored as absolute
    if not os.path.exists(absolute_folder):
        return JsonResponse({"error": "Output folder does not exist on server"}, status=404)

    # List only .dcm files
    all_files = os.listdir(absolute_folder)
    dicom_files = [f for f in all_files if f.lower().endswith('.dcm')]

    return JsonResponse({"dicom_files": dicom_files}, status=200)


@csrf_exempt
def serve_dicom_file(request, seg_id, filename):
    """
    GET endpoint to return a single DICOM file from the absolute path on disk.
    E.g. /dicoms/<seg_id>/<filename>
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    # Decode JWT
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)

    # Check physician
    try:
        if current_user.userprofile.role.lower() != "physician":
            return JsonResponse({"error": "Only physicians can view scans."}, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    # Fetch segmentation record
    try:
        seg = SegmentationRecord.objects.get(id=seg_id, physician=current_user)
    except SegmentationRecord.DoesNotExist:
        return JsonResponse({"error": "Segmentation not found"}, status=404)

    # Construct absolute file path
    absolute_folder = seg.output_folder_path  # e.g. /Users/.../Ankle_segmented...
    dicom_path = os.path.join(absolute_folder, filename)

    if not os.path.exists(dicom_path):
        raise Http404("DICOM file not found: " + filename)

    # Return the raw DICOM file
    # Content type isn't strictly required but can be "application/dicom" or "application/octet-stream"
    return FileResponse(open(dicom_path, 'rb'), content_type='application/dicom')


@csrf_exempt
def wado_rs_frame(request, seg_id, filename, frame_number):
    """
    Minimal WADO-RS-ish endpoint:
    GET /dicoms/<seg_id>/<filename>/frames/<frame_number>
    Returns a single-frame DICOM that Cornerstone can render.
    """
    if request.method != "GET":
        return JsonResponse({"error": "GET method required"}, status=405)

    # Decode JWT
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)

    try:
        if current_user.userprofile.role.lower() != "physician":
            return JsonResponse({"error": "Only physicians can view scans."}, status=403)
    except UserProfile.DoesNotExist:
        return JsonResponse({"error": "User profile not found"}, status=404)

    try:
        seg = SegmentationRecord.objects.get(id=seg_id, physician=current_user)
    except SegmentationRecord.DoesNotExist:
        return JsonResponse({"error": "Segmentation not found"}, status=404)

    dicom_path = os.path.join(seg.output_folder_path, filename)
    if not os.path.exists(dicom_path):
        raise Http404("DICOM file not found: " + filename)

    ds = pydicom.dcmread(dicom_path)

    # If single-frame or missing NumberOfFrames, just return the full file as is
    # (Cornerstone might call /frames/1 but we’ll give the entire single-frame DICOM)
    total_frames = ds.get("NumberOfFrames", 1)
    if total_frames == 1:
        # Return the entire file (unchanged)
        return FileResponse(open(dicom_path, 'rb'), content_type="application/dicom")

    # Otherwise, handle multi-frame data, extract the requested frame
    if frame_number < 1 or frame_number > total_frames:
        raise Http404(f"Requested frame {frame_number} out of range (1..{total_frames})")

    pixel_array = ds.pixel_array  # This loads all frames. If large, watch out for memory usage
    selected_frame_data = pixel_array[frame_number - 1]  # zero-based index

    single_frame_ds = ds.copy()  # Make a copy so we don't mutate the original
    single_frame_ds.NumberOfFrames = 1
    single_frame_ds.Rows = selected_frame_data.shape[0]
    single_frame_ds.Columns = selected_frame_data.shape[1] if len(selected_frame_data.shape) > 1 else 1

    single_frame_ds.PixelData = selected_frame_data.tobytes()
    buffer = BytesIO()
    single_frame_ds.save_as(buffer, write_like_original=False)
    buffer.seek(0)

    # Return as "application/dicom" so Cornerstone can parse it
    return HttpResponse(buffer, content_type="application/dicom")

@csrf_exempt
def resegment_images(request, segmentation_id):
    """
    Re-segment an existing scan (identified by segmentation_id) with new thresholds.
    - Will delete the old segmentation record and output folder, 
      then re-run segmentation and create a NEW record.
    - Expects JSON body with "lower_threshold", "upper_threshold".
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST method required"}, status=405)
    current_user, error_msg = decode_jwt_token(request)
    if current_user is None:
        return JsonResponse({"error": error_msg}, status=401)
    if current_user.userprofile.role.lower() != "physician":
        return JsonResponse({"error": "Only physicians can perform segmentation."}, status=403)
    try:
        data = json.loads(request.body)
        lower_threshold = int(data["lower_threshold"])
        upper_threshold = int(data["upper_threshold"])
    except (KeyError, json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Missing or invalid thresholds"}, status=400)
    try:
        old_record = SegmentationRecord.objects.get(id=segmentation_id)
    except SegmentationRecord.DoesNotExist:
        return JsonResponse({"error": "Segmentation record not found"}, status=404)

    old_output_folder = old_record.output_folder_path
    if os.path.exists(old_output_folder):
        shutil.rmtree(old_output_folder) 

    folder_path = old_record.folder_path
    patient_email = old_record.patient_email

    timestamp_str = timezone.now().strftime("%Y%m%d_%H%M%S")
    new_output_folder = f"{folder_path}_segmented_{timestamp_str}"
    os.makedirs(new_output_folder, exist_ok=True)

    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.dcm'):
            dicom_filepath = os.path.join(folder_path, filename)
            ds = pydicom.dcmread(dicom_filepath)

            image_hu = convert_to_hu(ds)
            segmented_image = segment_bone_hu(image_hu, lower_hu=lower_threshold, upper_hu=upper_threshold)
            ds.PixelData = segmented_image.astype(np.int16).tobytes()

            output_path = os.path.join(new_output_folder, filename)
            ds.save_as(output_path)

    new_record = SegmentationRecord.objects.create(
        physician=current_user,
        patient_email=patient_email,
        folder_path=folder_path,
        output_folder_path=new_output_folder,
        lower_threshold=lower_threshold,
        upper_threshold=upper_threshold
    )

    old_record.delete()

    return JsonResponse({
        "message": "Re-segmentation completed successfully",
        "new_segmentation_id": new_record.id
    }, status=200)