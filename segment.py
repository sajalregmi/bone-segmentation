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
    image = dicom_data.pixel_array.astype(np.float64)
    intercept = dicom_data.RescaleIntercept
    slope = dicom_data.RescaleSlope
    if slope != 1:
        image = image * slope
    image += intercept
    return image.astype(np.int16)


def segment_bone_hu(image_hu):
    lower_hu = 100
    upper_hu = 2000
    binary_mask = np.logical_and(image_hu >= lower_hu, image_hu <= upper_hu)
    binary_mask = (binary_mask * 255).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    segmented_bone = cv2.bitwise_and(image_hu, image_hu, mask=cleaned_mask)

    return segmented_bone

def load_dicom(filepath):
    dicom_data = pydicom.dcmread(filepath)
    print("DICOM DATA", dicom_data)
    image_hu = convert_to_hu(dicom_data)
    return image_hu

def main():
    filepath = "DICOM_IMAGES/Ankle/VHFCT1mm-Ankle (30).dcm"  # Update with your DICOM file path
    dicom_image_hu = load_dicom(filepath)
    bone_image = segment_bone_hu(dicom_image_hu)
    plt.figure(figsize=(10, 5))
    plt.subplot(1, 2, 1)
    plt.title("Original DICOM Image (HU)")
    plt.imshow(dicom_image_hu, cmap='gray')
    plt.axis('off')
    plt.subplot(1, 2, 2)
    plt.title("Segmented Bone Image")
    plt.imshow(bone_image, cmap='gray')
    plt.axis('off')

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    main()
