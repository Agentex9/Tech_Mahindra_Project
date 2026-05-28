from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import IssueAuctions, IssueBids, Issues, Projects


User = get_user_model()


class RoleProtectedProjectAndAuctionApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            password='password123',
            role='Admin',
            is_staff=True,
            is_superuser=True,
        )
        self.pm = User.objects.create_user(
            username='pm',
            password='password123',
            role='PM',
        )
        self.developer = User.objects.create_user(
            username='developer',
            password='password123',
            role='Developer',
            points_balance=100,
        )
        self.other_developer = User.objects.create_user(
            username='otherdev',
            password='password123',
            role='Developer',
            points_balance=85,
        )

        self.project = Projects.objects.create(
            name='Proyecto base',
            status='In Progress',
            project_manager=self.pm,
            created_by=self.pm,
            updated_by=self.pm,
        )
        self.issue = Issues.objects.create(
            project=self.project,
            title='Issue en bidding',
            assignment_type='Bidding',
            status='In Progress',
            assigned_to=self.developer,
            created_by=self.pm,
            updated_by=self.pm,
        )
        self.auction = IssueAuctions.objects.create(
            issue=self.issue,
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(hours=4),
            status='In Progress',
            created_by=self.pm,
            updated_by=self.pm,
        )
        self.top_bid = IssueBids.objects.create(
            auction=self.auction,
            bidder=self.other_developer,
            bid_amount=Decimal('15.00'),
            created_by=self.other_developer,
            updated_by=self.other_developer,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_create_project(self):
        self.authenticate(self.admin)

        response = self.client.post(
            reverse('projects:project-list'),
            {
                'name': 'Proyecto admin',
                'status': 'Not Started',
                'project_manager': self.pm.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Projects.objects.filter(name='Proyecto admin').count(), 1)

    def test_pm_can_create_project(self):
        self.authenticate(self.pm)

        response = self.client.post(
            reverse('projects:project-list'),
            {
                'name': 'Proyecto PM',
                'status': 'Not Started',
                'project_manager': self.pm.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Projects.objects.filter(name='Proyecto PM').count(), 1)

    def test_developer_cannot_create_project(self):
        self.authenticate(self.developer)

        response = self.client.post(
            reverse('projects:project-list'),
            {
                'name': 'Proyecto dev',
                'status': 'Not Started',
                'project_manager': self.pm.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_developer_can_list_projects(self):
        self.authenticate(self.developer)

        response = self.client.get(reverse('projects:project-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_developer_cannot_create_auction(self):
        self.authenticate(self.developer)

        response = self.client.post(
            reverse('projects:issue-auction-list'),
            {
                'issue': str(self.issue.issue_id),
                'start_date': timezone.now().isoformat(),
                'end_date': (timezone.now() + timedelta(hours=1)).isoformat(),
                'status': 'In Progress',
                'winner': None,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pm_can_create_auction(self):
        another_issue = Issues.objects.create(
            project=self.project,
            title='Nuevo issue bidding',
            assignment_type='Bidding',
            status='Not Started',
            created_by=self.pm,
            updated_by=self.pm,
        )
        self.authenticate(self.pm)

        response = self.client.post(
            reverse('projects:issue-auction-list'),
            {
                'issue': str(another_issue.issue_id),
                'start_date': timezone.now().isoformat(),
                'end_date': (timezone.now() + timedelta(hours=1)).isoformat(),
                'status': 'In Progress',
                'winner': None,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IssueAuctions.objects.filter(issue=another_issue).count(), 1)

    def test_developer_can_create_bid_for_self(self):
        self.authenticate(self.developer)

        response = self.client.post(
            reverse('projects:issue-bid-list'),
            {
                'auction': str(self.auction.auction_id),
                'bid_amount': '20.00',
                'bidder': self.other_developer.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_bid = IssueBids.objects.latest('created_at')
        self.assertEqual(created_bid.bidder_id, self.developer.pk)
        self.assertEqual(created_bid.created_by_id, self.developer.pk)
        self.assertEqual(created_bid.updated_by_id, self.developer.pk)
        self.developer.refresh_from_db()
        self.other_developer.refresh_from_db()
        self.assertEqual(self.developer.points_balance, 80)
        self.assertEqual(self.other_developer.points_balance, 100)

    def test_current_highest_bidder_only_reserves_delta_when_raising_bid(self):
        self.authenticate(self.other_developer)

        response = self.client.post(
            reverse('projects:issue-bid-list'),
            {
                'auction': str(self.auction.auction_id),
                'bid_amount': '20.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.other_developer.refresh_from_db()
        self.assertEqual(self.other_developer.points_balance, 80)

    def test_closing_auction_assigns_issue_to_highest_bidder(self):
        self.authenticate(self.pm)

        response = self.client.put(
            reverse('projects:issue-auction-detail', args=[self.auction.auction_id]),
            {
                'issue': str(self.issue.issue_id),
                'start_date': self.auction.start_date.isoformat(),
                'end_date': self.auction.end_date.isoformat(),
                'status': 'Completed',
                'winner': None,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.auction.refresh_from_db()
        self.issue.refresh_from_db()
        self.other_developer.refresh_from_db()
        self.assertEqual(self.auction.winner_id, self.other_developer.pk)
        self.assertEqual(self.issue.assigned_to_id, self.other_developer.pk)
        self.assertEqual(self.other_developer.points_balance, 85)

    def test_developer_cannot_bid_below_current_top_bid(self):
        self.authenticate(self.developer)

        response = self.client.post(
            reverse('projects:issue-bid-list'),
            {
                'auction': str(self.auction.auction_id),
                'bid_amount': '10.00',
                'bidder': self.developer.pk,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bid_amount', response.data)
