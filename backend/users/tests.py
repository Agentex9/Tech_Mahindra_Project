from django.contrib.auth import get_user_model
from django.test import TestCase


class UserModelTests(TestCase):
    def test_create_superuser_defaults_points_balance_to_zero(self):
        user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="strong-password-123",
        )

        self.assertEqual(user.points_balance, 0)
