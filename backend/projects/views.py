
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import (
    Projects, ProjectPlannings, ProjectFinancials, ProjectRisks, 
    Sprints, Issues, IssueComments, IssueAuctions, IssueBids, Label
    )
from .serializers import (
    ProjectSerializer, ProjectPlanningSerializer, 
    ProjectFinancialSerializer, ProjectRiskSerializer, SprintSerializer, IssueSerializer, 
    IssueCommentSerializer, IssueAuctionSerializer, IssueBidSerializer, LabelSerializer
    )


@extend_schema(tags=["Projects"], summary="Project CRUD operations", description="Create, retrieve, update, and delete projects.")
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Projects.objects.all().select_related(
        'project_manager', 'created_by', 'updated_by'
    )
    serializer_class = ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Project Planning"], summary="Project Planning CRUD operations", description="Manage project planning details.")
class ProjectPlanningViewSet(viewsets.ModelViewSet):
    queryset = ProjectPlannings.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectPlanningSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Project Financials"], summary="Project Financial CRUD operations", description="Manage project financial information.")
class ProjectFinancialViewSet(viewsets.ModelViewSet):
    queryset = ProjectFinancials.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectFinancialSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Project Risks"], summary="Project Risk CRUD operations", description="Manage project risk information.")
class ProjectRiskViewSet(viewsets.ModelViewSet):
    queryset = ProjectRisks.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectRiskSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Sprints"], summary="Sprint CRUD operations", description="Manage sprints for projects.")
class SprintViewSet(viewsets.ModelViewSet):
    queryset = Sprints.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = SprintSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issues"], summary="Issue CRUD operations", description="Manage issues within projects.")
class IssueViewSet(viewsets.ModelViewSet):
    queryset = Issues.objects.all().select_related(
        'sprint', 'created_by', 'updated_by'
    )
    serializer_class = IssueSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Comments"], summary="Issue Comment CRUD operations", description="Manage comments on issues.")
class IssueCommentViewSet(viewsets.ModelViewSet):
    queryset = IssueComments.objects.all().select_related(
        'issue', 'created_by', 'updated_by'
    )
    serializer_class = IssueCommentSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Auctions"], summary="Issue Auction CRUD operations", description="Manage auctions for issues.")
class IssueAuctionViewSet(viewsets.ModelViewSet):
    queryset = IssueAuctions.objects.all().select_related(
        'issue', 'created_by', 'updated_by'
    )
    serializer_class = IssueAuctionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Bids"], summary="Issue Bid CRUD operations", description="Manage bids for issue auctions.")
class IssueBidViewSet(viewsets.ModelViewSet):
    queryset = IssueBids.objects.all().select_related(
        'auction', 'created_by', 'updated_by'
    )
    serializer_class = IssueBidSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Labels"], summary="Label CRUD operations", description="Manage labels for issues and projects.")
class LabelViewSet(viewsets.ModelViewSet):
    queryset = Label.objects.all().select_related(
        'created_by', 'updated_by'
    )
    serializer_class = LabelSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


