from django.urls import path

from .views import AgentAnalysisView, AgentQdrantSyncView

app_name = 'agents'

urlpatterns = [
    path('analyze/', AgentAnalysisView.as_view(), name='analyze'),
    path('sync-qdrant/', AgentQdrantSyncView.as_view(), name='sync-qdrant'),
]
