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
    path('recipes/<slug:slug>/meals/', views.MealListCreate.as_view()),
    path('recipes/<slug:slug>/meals/<int:pk>/', views.MealDetail.as_view()),
    path('meals/', views.MyMealList.as_view()),
    path('meals/<int:pk>/', views.MyMealDetail.as_view()),
    path('ai/guide/', views.ai_guide),
    path('ai/import/', views.ai_import),
    path('ai/voice-command/', views.ai_voice_command),
    path('auth/me/', views.current_user),
    path('auth/register/', views.register),
    path('auth/login/', obtain_auth_token),
    path('auth/google/', views.google_oauth_start),
    path('auth/google/complete/', views.google_oauth_complete),
]
