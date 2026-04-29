
from rest_framework import viewsets
from drf_spectacular.utils import extend_schema

from .models import (
    Projects, ProjectPlannings, ProjectFinancials, ProjectRisks, 
    Sprints, Issues, IssueComments, IssueAuctions, IssueBids, Label
    )
from .serializers import (
    ProjectSerializer, ProjectPlanningSerializer, 
    ProjectFinancialSerializer, ProjectRiskSerializer, SprintSerializer, IssueSerializer, 
    IssueCommentSerializer, IssueAuctionSerializer, IssueBidSerializer, LabelSerializer
    )


class QueryFilterMixin:
    filter_mappings = {}

    def get_queryset(self):
        queryset = super().get_queryset()

        for query_param, lookup in self.filter_mappings.items():
            value = self.request.query_params.get(query_param)
            if value:
                queryset = queryset.filter(**{lookup: value})

        return queryset


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
class ProjectPlanningViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectPlannings.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectPlanningSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Project Financials"], summary="Project Financial CRUD operations", description="Manage project financial information.")
class ProjectFinancialViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectFinancials.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectFinancialSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Project Risks"], summary="Project Risk CRUD operations", description="Manage project risk information.")
class ProjectRiskViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectRisks.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = ProjectRiskSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Sprints"], summary="Sprint CRUD operations", description="Manage sprints for projects.")
class SprintViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Sprints.objects.all().select_related(
        'project', 'created_by', 'updated_by'
    )
    serializer_class = SprintSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issues"], summary="Issue CRUD operations", description="Manage issues within projects.")
class IssueViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Issues.objects.all().select_related(
        'project', 'informed_by', 'assigned_to', 'created_by', 'updated_by'
    )
    serializer_class = IssueSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Comments"], summary="Issue Comment CRUD operations", description="Manage comments on issues.")
class IssueCommentViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueComments.objects.all().select_related(
        'issue', 'created_by', 'updated_by'
    )
    serializer_class = IssueCommentSerializer
    filter_mappings = {'issue': 'issue_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Auctions"], summary="Issue Auction CRUD operations", description="Manage auctions for issues.")
class IssueAuctionViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueAuctions.objects.all().select_related(
        'issue', 'created_by', 'updated_by'
    )
    serializer_class = IssueAuctionSerializer
    filter_mappings = {'issue': 'issue_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Issue Bids"], summary="Issue Bid CRUD operations", description="Manage bids for issue auctions.")
class IssueBidViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueBids.objects.all().select_related(
        'auction', 'created_by', 'updated_by'
    )
    serializer_class = IssueBidSerializer
    filter_mappings = {'auction': 'auction_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

@extend_schema(tags=["Labels"], summary="Label CRUD operations", description="Manage labels for issues and projects.")
class LabelViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Label.objects.all().select_related(
        'created_by', 'updated_by'
    )
    serializer_class = LabelSerializer
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


