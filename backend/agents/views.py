from drf_spectacular.utils import extend_schema
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AgentAnalysisRequestSerializer, AgentAnalysisResponseSerializer
from .services import AgentAnalysisService


class PrivilegedAgentPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_privileged_role', False))


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
