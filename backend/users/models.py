from django.db import models
from projects.models import AuditModel
from django.contrib.auth.models import AbstractUser
from uuid import uuid4


class User(AuditModel, AbstractUser):
    role = models.CharField(max_length=50)
    points_balance = models.IntegerField()

    def __str__(self):
        return self.username


class PointTransaction(AuditModel):
    transaction_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transactions')
    points = models.IntegerField()
    type = models.CharField(max_length=50)
    issue_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.user_id} - {self.points}"


class RouletteSpin(AuditModel):
    spin_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='spins')
    points_won = models.IntegerField()
    spin_cost = models.IntegerField()

    def __str__(self):
        return f"{self.user_id} - {self.points_won}"