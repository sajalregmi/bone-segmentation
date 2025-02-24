import json
import datetime
import jwt as pyjwt
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import UserProfile

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
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
    }
    token = pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return JsonResponse({"access_token": token})
