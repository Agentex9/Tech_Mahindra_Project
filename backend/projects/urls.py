from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ProjectViewSet

app_name = 'projects'

router = SimpleRouter()
router.register('', ProjectViewSet, basename='project')

urlpatterns = [
    path('', include(router.urls)),
]
