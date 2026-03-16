from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .serializer import CustomTokenObtainPairView
from django.conf.urls.static import static
from .settings import local

urlpatterns = [
    re_path(r'^admin/', admin.site.urls),
    path('api/token/',         CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(),          name='token_refresh'),
    re_path(r'^api/', include('api.urls', namespace='api')),

    # ── Frontend SPA (React Router trata estas rotas) ──
    re_path(r'^app/.*$',            include('frontend.urls')),
    re_path(r'^reset-password/.*$', include('frontend.urls')), 
    re_path(r'^$',                  include('frontend.urls')),
]

if local:
    urlpatterns += static(local.MEDIA_URL, document_root=local.MEDIA_ROOT)