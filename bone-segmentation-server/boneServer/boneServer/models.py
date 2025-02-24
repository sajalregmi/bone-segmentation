from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('physician', 'Physician'),
        ('patient', 'Patient'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} ({self.role})"
    

class SegmentationRecord(models.Model):
    """
    Stores each segmentation operation:
    - physician (ForeignKey to User)
    - patient_email (the email of the patient for whom the segmentation was done)
    - folder_path (the original folder of DICOM images)
    - output_folder_path (where the segmented DICOMs are saved)
    - lower_threshold, upper_threshold
    - created_at
    """
    physician = models.ForeignKey(User, on_delete=models.CASCADE, related_name="segmentations")
    patient_email = models.EmailField()
    folder_path = models.CharField(max_length=255)
    output_folder_path = models.CharField(max_length=255, blank=True, null=True)
    lower_threshold = models.IntegerField()
    upper_threshold = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Segmentation by {self.physician.username} for {self.patient_email} - {self.created_at}"
