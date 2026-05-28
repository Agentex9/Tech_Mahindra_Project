from django.urls import path

from .views import AgentAnalysisView

app_name = 'agents'

urlpatterns = [
    path('analyze/', AgentAnalysisView.as_view(), name='analyze'),
]
