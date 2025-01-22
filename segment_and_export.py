import os
import pydicom
import numpy as np
import cv2
import uuid
import matplotlib.pyplot as plt

def convert_to_hu(dicom_data):
    """
    Convert raw pixel_array to Hounsfield Units using
    the DICOM RescaleSlope and RescaleIntercept.
    """
    image = dicom_data.pixel_array.astype(np.float64)
    intercept = dicom_data.RescaleIntercept
    slope = dicom_data.RescaleSlope
    
    if slope != 1:
        image = slope * image
    image += intercept

    return image

def segment_bone_hu(image_hu, lower_hu=300, upper_hu=2000):
    """
    1. Threshold HU into [lower_hu, upper_hu]
    2. Morphological closing to remove small holes
    3. Return both the masked HU image and the binary mask
    """
    binary_mask = np.logical_and(image_hu >= lower_hu, image_hu <= upper_hu).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    segmented_bone = image_hu * (cleaned_mask > 0)

    return segmented_bone, cleaned_mask

def hu_to_original_scale(segmented_hu, dicom_data):
    """
    Convert the HU image back to the original pixel scale
    using the inverse of RescaleSlope and RescaleIntercept.
    This allows us to store the data in the same way as the
    original DICOM without needing extra modifications to
    slope/intercept tags.
    """
    slope = dicom_data.RescaleSlope
    intercept = dicom_data.RescaleIntercept
    pixel_original = (segmented_hu - intercept) / slope
    pixel_original = np.clip(pixel_original, -32768, 32767)

    return pixel_original.astype(np.int16)

def process_and_save_slices(input_folder, output_folder,
                            lower_hu=300, upper_hu=2000):
    """
    1. Load all DICOM files from `input_folder`.
    2. Segment bones by HU threshold.
    3. Save to `output_folder` with updated pixel data.
    """
    os.makedirs(output_folder, exist_ok=True)
    dicom_files = [
        os.path.join(input_folder, f) for f in os.listdir(input_folder)
        if f.lower().endswith(".dcm")
    ]

    def get_instance_number(filepath):
        ds = pydicom.dcmread(filepath, stop_before_pixels=True)
        return int(ds.InstanceNumber) if 'InstanceNumber' in ds else 0

    dicom_files.sort(key=get_instance_number)

    new_series_uid = pydicom.uid.generate_uid()

    for i, dcm_path in enumerate(dicom_files):
        ds = pydicom.dcmread(dcm_path)

        hu_image = convert_to_hu(ds)

        segmented_hu, bone_mask = segment_bone_hu(hu_image,
                                                  lower_hu=lower_hu,
                                                  upper_hu=upper_hu)

        if i == 30:
            plt.figure(figsize=(15,5))
            plt.subplot(1,3,1)
            plt.title("Original HU")
            plt.imshow(hu_image, cmap='gray')
            plt.axis('off')
            
            plt.subplot(1,3,2)
            plt.title("Segmented HU")
            plt.imshow(segmented_hu, cmap='gray')
            plt.axis('off')

            plt.subplot(1,3,3)
            plt.title("Binary Mask")
            plt.imshow(bone_mask, cmap='gray')
            plt.axis('off')
            plt.show()

        segmented_raw = hu_to_original_scale(segmented_hu, ds)

        ds.PixelData = segmented_raw.tobytes()

        ds.SeriesInstanceUID = new_series_uid
        ds.SeriesDescription = "Bone_Segmented"
        ds.SeriesNumber = 999  

        if 'ImageType' in ds:
            new_image_type = list(ds.ImageType)
            if 'DERIVED' not in new_image_type:
                new_image_type.insert(0, 'DERIVED')
            ds.ImageType = "\\".join(new_image_type)

        output_filename = os.path.join(output_folder, f"segmented_{i+1:03d}.dcm")
        ds.save_as(output_filename)

    print(f"All segmented slices saved to: {output_folder}")

def main():
    input_folder = "DICOM_IMAGES/Ankle"          # DICOM_FOLDER
    output_folder = "DICOM_IMAGES/Ankle_segmented"

    process_and_save_slices(
        input_folder, 
        output_folder,
        lower_hu=200,
        upper_hu=2000
    )

if __name__ == "__main__":
    main()
