from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    IssueAuctionViewSet,
    IssueBidViewSet,
    IssueCommentViewSet,
    IssueViewSet,
    LabelViewSet,
    ProjectFinancialViewSet,
    ProjectPlanningViewSet,
    ProjectRiskViewSet,
    ProjectViewSet,
    SprintViewSet,
)

app_name = 'projects'

router = SimpleRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('plannings', ProjectPlanningViewSet, basename='project-planning')
router.register('financials', ProjectFinancialViewSet, basename='project-financial')
router.register('risks', ProjectRiskViewSet, basename='project-risk')
router.register('sprints', SprintViewSet, basename='sprint')
router.register('issues', IssueViewSet, basename='issue')
router.register('issue-comments', IssueCommentViewSet, basename='issue-comment')
router.register('issue-auctions', IssueAuctionViewSet, basename='issue-auction')
router.register('issue-bids', IssueBidViewSet, basename='issue-bid')
router.register('labels', LabelViewSet, basename='label')

urlpatterns = [
    path('', include(router.urls)),
]
