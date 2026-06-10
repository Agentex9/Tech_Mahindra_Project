from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AgentAnalysisRequestSerializer, AgentAnalysisResponseSerializer, AgentQdrantSyncResponseSerializer
from .services import AgentAnalysisService


class PrivilegedAgentPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_privileged_role', False))


class AdminAgentPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_admin_role', False))


@extend_schema(
    tags=['Agent'],
    summary='Analyze workspace risks with LLM + RAG context',
    request=AgentAnalysisRequestSerializer,
    responses={200: AgentAnalysisResponseSerializer},
)
class AgentAnalysisView(APIView):
    permission_classes = [PrivilegedAgentPermission]

    def post(self, request):
        serializer = AgentAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AgentAnalysisService()
        result = service.analyze(
            project_id=str(serializer.validated_data['project_id']) if serializer.validated_data.get('project_id') else None,
            question=serializer.validated_data['question'],
            top_k=serializer.validated_data['top_k'],
        )
        return Response(result)


@extend_schema(
    tags=['Agent'],
    summary='Synchronize relational data into Qdrant',
    request=None,
    responses={200: AgentQdrantSyncResponseSerializer},
)
class AgentQdrantSyncView(APIView):
    permission_classes = [AdminAgentPermission]

    def post(self, request):
        output = StringIO()
        try:
            call_command('sync_qdrant', stdout=output)
        except CommandError as exc:
            return Response(
                {
                    'detail': str(exc),
                    'output': output.getvalue(),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'detail': 'Qdrant sincronizado correctamente.',
                'output': output.getvalue(),
            }
        )
