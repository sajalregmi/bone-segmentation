"""
URL configuration for boneServer project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static


from .views import signup, login, segment_images, get_scans, get_dicom_files, serve_dicom_file, wado_rs_frame, resegment_images

urlpatterns = [
    path("admin/", admin.site.urls),
    path("signup/", signup, name="signup"),
    path("login/", login, name="login"),
    path("segment-images/", segment_images, name="segment_images"),
    path("get-scans/", get_scans, name="get_scans"),
    path('get-dicom-files/<int:seg_id>/', get_dicom_files, name='get_dicom_files'),
    path('dicoms/<int:seg_id>/<str:filename>/', serve_dicom_file, name='serve_dicom_file'),
     path('resegment-images/<int:segmentation_id>/',resegment_images, name='resegment-images'),

     path(
        "dicoms/<int:seg_id>/<str:filename>/frames/<int:frame_number>/",
        wado_rs_frame,
        name="wado_rs_frame"
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

