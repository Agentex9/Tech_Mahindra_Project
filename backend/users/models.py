from uuid import uuid4

from django.contrib.auth.models import AbstractUser
from django.db import models
from knox.models import AuthToken
from projects.models import AuditModel


class User(AuditModel, AbstractUser):
    class RoleChoices(models.TextChoices):
        ADMIN = 'Admin', 'Admin'
        PM = 'PM', 'PM'
        DEVELOPER = 'Developer', 'Developer'

    role = models.CharField(max_length=50)
    points_balance = models.IntegerField(default=0)

    @staticmethod
    def normalize_role(role):
        mapping = {
            'admin': User.RoleChoices.ADMIN,
            'pm': User.RoleChoices.PM,
            'developer': User.RoleChoices.DEVELOPER,
        }
        if role is None:
            return ''
        normalized = str(role).strip().lower()
        return mapping.get(normalized, str(role).strip())

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.RoleChoices.ADMIN
            self.is_staff = True
        elif not self.role:
            self.role = self.RoleChoices.DEVELOPER
        else:
            self.role = self.normalize_role(self.role)
        super().save(*args, **kwargs)

    @property
    def is_admin_role(self):
        return self.is_superuser or self.normalize_role(self.role) == self.RoleChoices.ADMIN

    @property
    def is_pm_role(self):
        return self.normalize_role(self.role) == self.RoleChoices.PM

    @property
    def is_developer_role(self):
        return self.normalize_role(self.role) == self.RoleChoices.DEVELOPER

    @property
    def is_privileged_role(self):
        return self.is_admin_role or self.is_pm_role

    def __str__(self):
        return self.username


class AuthSession(models.Model):
    token = models.OneToOneField(AuthToken, on_delete=models.CASCADE, related_name='session_metadata')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_sessions')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session for {self.user_id} ({self.ip_address or 'unknown-ip'})"


class PointTransaction(AuditModel):
    transaction_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transactions')
    points = models.IntegerField()
    type = models.CharField(max_length=50)
    issue_id = models.ForeignKey('projects.Issues', on_delete=models.SET_NULL, null=True, related_name='point_transactions')

    def __str__(self):
        return f"{self.user_id} - {self.points}"


class RouletteSpin(AuditModel):
    spin_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='spins')
    points_won = models.IntegerField()
    spin_cost = models.IntegerField()

    def __str__(self):
        return f"{self.user_id} - {self.points_won}"
