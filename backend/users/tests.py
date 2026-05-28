from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PointTransaction, RouletteSpin


User = get_user_model()


class UserModelTests(APITestCase):
    def test_create_superuser_defaults_points_balance_to_zero(self):
        user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='strong-password-123',
        )

        self.assertEqual(user.points_balance, 0)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertEqual(user.role, 'Admin')


class RouletteApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='developer',
            password='password123',
            role='Developer',
            points_balance=100,
        )
        self.other_user = User.objects.create_user(
            username='other',
            password='password123',
            role='Developer',
            points_balance=50,
        )
        self.client.force_authenticate(user=self.user)

    @patch('random.choice', return_value={'value': 0, 'color': 'green'})
    def test_spin_roulette_returns_expected_contract_and_updates_balance(self, _mock_choice):
        response = self.client.post(
            reverse('users:roulette-spin'),
            {
                'amount': 10,
                'option': 'green',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.points_balance, 230)
        self.assertEqual(response.data['amount'], 10)
        self.assertEqual(response.data['option'], 'green')
        self.assertEqual(response.data['result'], 0)
        self.assertEqual(response.data['color'], 'green')
        self.assertTrue(response.data['won'])
        self.assertEqual(response.data['multiplier'], 14)
        self.assertEqual(response.data['payout'], 140)
        self.assertEqual(response.data['balance_after'], 230)
        self.assertTrue(RouletteSpin.objects.filter(user=self.user, points_won=140, spin_cost=10).exists())
        self.assertEqual(PointTransaction.objects.filter(user=self.user).count(), 2)
        self.assertTrue(PointTransaction.objects.filter(user=self.user, points=-10, type='roulette_spin_cost').exists())
        self.assertTrue(PointTransaction.objects.filter(user=self.user, points=140, type='roulette_payout').exists())

    def test_spin_roulette_rejects_amount_above_balance(self):
        response = self.client.post(
            reverse('users:roulette-spin'),
            {
                'amount': 101,
                'option': 'red',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'No tienes puntos suficientes para esa apuesta.')

    def test_user_only_sees_own_spins_and_transactions(self):
        RouletteSpin.objects.create(
            user=self.user,
            points_won=20,
            spin_cost=10,
            created_by=self.user,
            updated_by=self.user,
        )
        RouletteSpin.objects.create(
            user=self.other_user,
            points_won=30,
            spin_cost=10,
            created_by=self.other_user,
            updated_by=self.other_user,
        )
        PointTransaction.objects.create(
            user=self.user,
            points=-10,
            type='roulette_spin_cost',
            created_by=self.user,
            updated_by=self.user,
        )
        PointTransaction.objects.create(
            user=self.other_user,
            points=50,
            type='bonus',
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        spins_response = self.client.get(reverse('users:roulette-spins'))
        transactions_response = self.client.get(reverse('users:point-transactions'))

        self.assertEqual(spins_response.status_code, status.HTTP_200_OK)
        self.assertEqual(transactions_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(spins_response.data), 1)
        self.assertEqual(len(transactions_response.data), 1)
        self.assertEqual(spins_response.data[0]['spin_cost'], 10)
        self.assertEqual(transactions_response.data[0]['type'], 'roulette_spin_cost')


class UserManagementApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin',
            password='password123',
            role='Admin',
            is_staff=True,
        )
        self.developer = User.objects.create_user(
            username='developer',
            password='password123',
            role='Developer',
        )

    def test_admin_can_create_user(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse('users:user-list'),
            {
                'username': 'pm-user',
                'email': 'pm@example.com',
                'first_name': 'PM',
                'last_name': 'User',
                'role': 'PM',
                'points_balance': 25,
                'is_active': True,
                'password': 'password123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = User.objects.get(username='pm-user')
        self.assertEqual(created_user.role, 'PM')
        self.assertEqual(created_user.points_balance, 25)
        self.assertTrue(created_user.check_password('password123'))

    def test_admin_can_update_user_role_and_points(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse('users:user-detail', args=[self.developer.pk]),
            {
                'role': 'PM',
                'points_balance': 40,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.developer.refresh_from_db()
        self.assertEqual(self.developer.role, 'PM')
        self.assertEqual(self.developer.points_balance, 40)

    def test_non_admin_cannot_manage_users(self):
        self.client.force_authenticate(user=self.developer)

        response = self.client.get(reverse('users:user-list'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
