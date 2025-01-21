# -*- coding: utf-8 -*-
"""
Created on Fri Jan 17 07:59:05 2025

@author: sregmi7
"""

import pydicom
import numpy as np
import cv2
import matplotlib.pyplot as plt

def convert_to_hu(dicom_data):
    """
    Convert DICOM pixel values to Hounsfield Units using RescaleSlope, RescaleIntercept.
    """
    image = dicom_data.pixel_array.astype(np.float64)
    intercept = dicom_data.RescaleIntercept
    slope = dicom_data.RescaleSlope
    
    print("Slope ", slope)
    print("Intercept ", intercept)

    if slope != 1:
        image = image * slope
    image += intercept

    return image.astype(np.int16)

def segment_bone_hu(image_hu, lower_hu=300, upper_hu=2000):
    """
    1. Threshold HU into [lower_hu, upper_hu]
    2. Morphological closing to remove small holes
    3. Return both the masked HU image and the binary mask
    """
    binary_mask = np.logical_and(image_hu >= lower_hu, image_hu <= upper_hu)
    binary_mask = (binary_mask * 255).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    segmented_bone = cv2.bitwise_and(image_hu, image_hu, mask=cleaned_mask)
    
    return segmented_bone, cleaned_mask

def load_dicom(filepath):
    """
    Read a single DICOM file and convert it to HU.
    """
    dicom_data = pydicom.dcmread(filepath)
    print("DICOM DATA:", dicom_data)
    image_hu = convert_to_hu(dicom_data)
    return image_hu

def main():
    filepath = "DICOM_IMAGES/Ankle/VHFCT1mm-Ankle (30).dcm"
    dicom_image_hu = load_dicom(filepath)
    bone_image, bone_mask = segment_bone_hu(dicom_image_hu, lower_hu=200, upper_hu=2000)
    plt.figure(figsize=(15, 5))
    
    plt.subplot(1, 3, 1)
    plt.title("Original DICOM Image (HU)")
    plt.imshow(dicom_image_hu, cmap='gray')
    plt.axis('off')
    
    plt.subplot(1, 3, 2)
    plt.title("Segmented Bone Image (HU)")
    plt.imshow(bone_image, cmap='gray')
    plt.axis('off')
    
    plt.subplot(1, 3, 3)
    plt.title("Binary Bone Mask")
    plt.imshow(bone_mask, cmap='gray')
    plt.axis('off')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()
