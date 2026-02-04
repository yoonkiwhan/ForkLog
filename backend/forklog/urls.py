"""
URL configuration for ForkLog.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('recipes.urls')),
    path('accounts/', include('allauth.urls')),
]
