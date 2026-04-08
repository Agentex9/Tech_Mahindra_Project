from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import AuthViewSet

app_name = 'users'

router = SimpleRouter()
router.register('auth', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
]
