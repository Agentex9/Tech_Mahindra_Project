from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.permissions import SAFE_METHODS, BasePermission

from users.models import PointTransaction, User

from .models import (
    IssueAuctions,
    IssueBids,
    IssueComments,
    Issues,
    Label,
    ProjectFinancials,
    ProjectPlannings,
    ProjectRisks,
    Projects,
    Sprints,
)
from .serializers import (
    IssueAuctionSerializer,
    IssueBidSerializer,
    IssueCommentSerializer,
    IssueSerializer,
    LabelSerializer,
    ProjectFinancialSerializer,
    ProjectPlanningSerializer,
    ProjectRiskSerializer,
    ProjectSerializer,
    SprintSerializer,
)
from .services import complete_auction, get_top_bid


class QueryFilterMixin:
    filter_mappings = {}
    search_mappings = {}

    def get_queryset(self):
        queryset = super().get_queryset()

        for query_param, lookup in self.filter_mappings.items():
            value = self.request.query_params.get(query_param)
            if value:
                if value == 'null':
                    queryset = queryset.filter(**{f'{lookup}__isnull': True})
                else:
                    queryset = queryset.filter(**{lookup: value})

        for query_param, lookup in self.search_mappings.items():
            value = self.request.query_params.get(query_param)
            if value:
                queryset = queryset.filter(**{lookup: value})

        return queryset


class PrivilegedWritePermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, 'is_privileged_role', False)


class IssuePermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS or request.method in ('POST', 'PATCH'):
            return True
        return getattr(user, 'is_privileged_role', False)


class CommentPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS or request.method == 'POST':
            return True
        return getattr(user, 'is_privileged_role', False)


class BidPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS or request.method == 'POST':
            return True
        return getattr(user, 'is_privileged_role', False)


@extend_schema(tags=['Projects'], summary='Project CRUD operations', description='Create, retrieve, update, and delete projects.')
class ProjectViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Projects.objects.all().select_related('project_manager', 'created_by', 'updated_by')
    serializer_class = ProjectSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {
        'project_manager': 'project_manager_id',
        'status': 'status',
    }
    search_mappings = {
        'client': 'client__icontains',
        'description': 'description__icontains',
        'name': 'name__icontains',
        'project_type': 'project_type__icontains',
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Project Planning'], summary='Project Planning CRUD operations', description='Manage project planning details.')
class ProjectPlanningViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectPlannings.objects.all().select_related('project', 'created_by', 'updated_by')
    serializer_class = ProjectPlanningSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Project Financials'], summary='Project Financial CRUD operations', description='Manage project financial information.')
class ProjectFinancialViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectFinancials.objects.all().select_related('project', 'created_by', 'updated_by')
    serializer_class = ProjectFinancialSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Project Risks'], summary='Project Risk CRUD operations', description='Manage project risk information.')
class ProjectRiskViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = ProjectRisks.objects.all().select_related('project', 'created_by', 'updated_by')
    serializer_class = ProjectRiskSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Sprints'], summary='Sprint CRUD operations', description='Manage sprints for projects.')
class SprintViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Sprints.objects.all().select_related('project', 'created_by', 'updated_by')
    serializer_class = SprintSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Issues'], summary='Issue CRUD operations', description='Manage issues within projects.')
class IssueViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Issues.objects.all().select_related('project', 'informed_by', 'assigned_to', 'created_by', 'updated_by')
    serializer_class = IssueSerializer
    permission_classes = [IssuePermission]
    filter_mappings = {
        'assigned_to': 'assigned_to_id',
        'assignment_type': 'assignment_type',
        'priority': 'priority',
        'project': 'project_id',
        'status': 'status',
    }
    search_mappings = {
        'description': 'description__icontains',
        'issue_type': 'issue_type__icontains',
        'title': 'title__icontains',
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Issue Comments'], summary='Issue Comment CRUD operations', description='Manage comments on issues.')
class IssueCommentViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueComments.objects.all().select_related('issue', 'created_by', 'updated_by')
    serializer_class = IssueCommentSerializer
    permission_classes = [CommentPermission]
    filter_mappings = {'issue': 'issue_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Issue Auctions'], summary='Issue Auction CRUD operations', description='Manage auctions for issues.')
class IssueAuctionViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueAuctions.objects.all().select_related('issue', 'created_by', 'updated_by', 'winner')
    serializer_class = IssueAuctionSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'issue': 'issue_id'}

    def _get_top_bid(self, auction):
        return get_top_bid(auction)

    def perform_create(self, serializer):
        issue = serializer.validated_data['issue']
        if issue.assignment_type != 'Bidding':
            raise serializers.ValidationError({'issue': 'Solo los issues con assignment_type Bidding pueden entrar a subasta.'})
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        with transaction.atomic():
            auction = IssueAuctions.objects.select_for_update().select_related('issue').get(pk=serializer.instance.pk)
            issue = Issues.objects.select_for_update().get(pk=auction.issue_id)
            next_status = serializer.validated_data.get('status', auction.status)

            if auction.status in {'Completed', 'Cancelled'} and next_status != auction.status:
                raise serializers.ValidationError({'status': 'No se puede reabrir una subasta finalizada o cancelada.'})

            if next_status == 'Completed' and auction.status != 'Completed':
                completed_auction, _ = complete_auction(auction.pk, updated_by=self.request.user)
                serializer.instance = completed_auction
                return

            if next_status == 'Cancelled' and auction.status != 'Cancelled':
                top_bid = self._get_top_bid(auction)
                if top_bid and top_bid.bidder_id:
                    highest_bidder = User.objects.select_for_update().get(pk=top_bid.bidder_id)
                    released_points = int(top_bid.bid_amount)
                    highest_bidder.points_balance += released_points
                    highest_bidder.updated_by = self.request.user
                    highest_bidder.save(update_fields=['points_balance', 'updated_at', 'updated_by'])
                    PointTransaction.objects.create(
                        user=highest_bidder,
                        points=released_points,
                        type='auction_bid_release',
                        issue_id=auction.issue,
                        created_by=self.request.user,
                        updated_by=self.request.user,
                    )
                serializer.save(updated_by=self.request.user, winner=None, status='Cancelled')
                return

            serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Issue Bids'], summary='Issue Bid CRUD operations', description='Manage bids for issue auctions.')
class IssueBidViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = IssueBids.objects.all().select_related('auction', 'bidder', 'created_by', 'updated_by')
    serializer_class = IssueBidSerializer
    permission_classes = [BidPermission]
    filter_mappings = {'auction': 'auction_id'}

    def _get_top_bid(self, auction):
        return get_top_bid(auction)

    def perform_create(self, serializer):
        with transaction.atomic():
            auction = IssueAuctions.objects.select_for_update().select_related('issue').get(
                pk=serializer.validated_data['auction'].pk
            )
            bid_amount = serializer.validated_data['bid_amount']
            now = timezone.now()
            top_bid = self._get_top_bid(auction)
            bidder = User.objects.select_for_update().get(pk=self.request.user.pk)

            if bid_amount != bid_amount.to_integral_value():
                raise serializers.ValidationError({'bid_amount': 'Las subastas usan puntos enteros.'})
            if auction.status != 'In Progress' or now < auction.start_date or now > auction.end_date:
                raise serializers.ValidationError({'auction': 'La subasta no esta activa.'})
            if top_bid is not None and bid_amount < top_bid.bid_amount:
                raise serializers.ValidationError({'bid_amount': 'La oferta no puede ser menor a la mas alta actual.'})

            reserve_delta = int(bid_amount)
            if top_bid and top_bid.bidder_id == bidder.pk:
                reserve_delta = int(bid_amount - top_bid.bid_amount)

            if reserve_delta > bidder.points_balance:
                raise serializers.ValidationError({'bid_amount': 'No tienes puntos suficientes para sostener esa oferta.'})

            if top_bid and top_bid.bidder_id and top_bid.bidder_id != bidder.pk:
                previous_highest_bidder = User.objects.select_for_update().get(pk=top_bid.bidder_id)
                released_points = int(top_bid.bid_amount)
                previous_highest_bidder.points_balance += released_points
                previous_highest_bidder.updated_by = self.request.user
                previous_highest_bidder.save(update_fields=['points_balance', 'updated_at', 'updated_by'])
                PointTransaction.objects.create(
                    user=previous_highest_bidder,
                    points=released_points,
                    type='auction_bid_release',
                    issue_id=auction.issue,
                    created_by=self.request.user,
                    updated_by=self.request.user,
                )

            if reserve_delta > 0:
                bidder.points_balance -= reserve_delta
                bidder.updated_by = self.request.user
                bidder.save(update_fields=['points_balance', 'updated_at', 'updated_by'])
                PointTransaction.objects.create(
                    user=bidder,
                    points=-reserve_delta,
                    type='auction_bid_hold',
                    issue_id=auction.issue,
                    created_by=self.request.user,
                    updated_by=self.request.user,
                )

            serializer.save(
                bidder=bidder,
                created_by=self.request.user,
                updated_by=self.request.user,
            )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


@extend_schema(tags=['Labels'], summary='Label CRUD operations', description='Manage labels for issues and projects.')
class LabelViewSet(QueryFilterMixin, viewsets.ModelViewSet):
    queryset = Label.objects.all().select_related('project', 'created_by', 'updated_by')
    serializer_class = LabelSerializer
    permission_classes = [PrivilegedWritePermission]
    filter_mappings = {'project': 'project_id'}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
