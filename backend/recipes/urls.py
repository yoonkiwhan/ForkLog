"""
API URL routes for recipes app.
"""

from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views

urlpatterns = [
    path('recipes/', views.RecipeListCreate.as_view()),
    path('recipes/<slug:slug>/', views.RecipeDetail.as_view()),
    path('recipes/<slug:slug>/versions/', views.RecipeVersionList.as_view()),
    path('recipes/<slug:slug>/versions/<int:pk>/', views.RecipeVersionDetail.as_view()),
    path('recipes/<slug:slug>/sessions/', views.CookingSessionListCreate.as_view()),
    path('recipes/<slug:slug>/sessions/<int:pk>/', views.CookingSessionDetail.as_view()),
    path('sessions/', views.MyCookingSessionList.as_view()),
    path('sessions/<int:pk>/', views.MyCookingSessionDetail.as_view()),
    path('ai/guide/', views.ai_guide),
    path('ai/import/', views.ai_import),
    path('ai/voice-command/', views.ai_voice_command),
    path('auth/me/', views.current_user),
    path('auth/register/', views.register),
    path('auth/login/', obtain_auth_token),
    path('auth/google/', views.google_oauth_start),
    path('auth/google/complete/', views.google_oauth_complete),
]
