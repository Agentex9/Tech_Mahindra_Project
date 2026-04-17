from rest_framework import viewsets

from .models import Projects
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Projects.objects.all().select_related(
        'project_manager', 'created_by', 'updated_by'
    )
    serializer_class = ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
