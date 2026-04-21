from rest_framework import serializers

from .models import (
    Projects, ProjectPlannings, ProjectFinancials, ProjectRisks,
    Sprints, Issues, IssueComments, IssueAuctions, IssueBids, Label
    )


class AuditSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    updated_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        abstract = True
        fields = ['created_at', 'updated_at', 'created_by', 'updated_by']

        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']

class ProjectSerializer(AuditSerializer):
    class Meta:
        model = Projects
        fields = (
            'project_id',
            'name',
            'description',
            'client',
            'project_type',
            'status',
            'project_manager',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )
        read_only_fields = (
            'project_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )


class ProjectPlanningSerializer(AuditSerializer):
    planned_start_date = serializers.DateField(help_text="Planned start date of the project")
    planned_end_date = serializers.DateField(help_text="Planned end date of the project")
    estimated_duration = serializers.IntegerField(read_only=True, help_text="Estimated duration in days")
    methodology = serializers.CharField(required=False, allow_blank=True, help_text="Project methodology")
    estimated_sprint_count = serializers.IntegerField(help_text="Estimated number of sprints")
    scope_statement = serializers.CharField(required=False, allow_blank=True, help_text="Scope statement for the project")

    class Meta:
        model = ProjectPlannings
        fields = "__all__"
        read_only_fields = (
            'planning_id',
            'estimated_duration',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )


class ProjectFinancialSerializer(AuditSerializer):
    estimated_budget = serializers.DecimalField(max_digits=12, decimal_places=2, help_text="Estimated total budget for the project")
    estimated_monthly_cost = serializers.DecimalField(max_digits=12, decimal_places=2, help_text="Estimated monthly cost for the project")
    billing_model = serializers.CharField(required=False, allow_blank=True, help_text="Billing model for the project")

    class Meta:
        model = ProjectFinancials
        fields = "__all__"
        read_only_fields = (
            'financial_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )


class ProjectRiskSerializer(AuditSerializer):
    risk_name = serializers.CharField(help_text="Name of the risk")
    risk_description = serializers.CharField(required=False, allow_blank=True, help_text="Description of the risk")
    deviation_tolerance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, help_text="Acceptable deviation percentage")
    delay_weight = serializers.DecimalField(max_digits=5, decimal_places=2, help_text="Weight for schedule delays")
    budget_weight = serializers.DecimalField(max_digits=5, decimal_places=2, help_text="Weight for budget overruns")
    complexity_level = serializers.CharField(required=False, allow_blank=True, help_text="Complexity level of the risk")
    external_dependencies = serializers.CharField(required=False, allow_blank=True, help_text="External dependencies related to the risk")

    class Meta:
        model = ProjectRisks
        fields = "__all__"
        read_only_fields = (
            'risk_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class SprintSerializer(AuditSerializer):
    class Meta:
        model = Sprints
        fields = ("__all__")

        read_only_fields = (
            'sprint_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class IssueSerializer(AuditSerializer):
    class Meta:
        model = Issues
        fields = ("__all__")

        read_only_fields = (
            'issue_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class IssueCommentSerializer(AuditSerializer):
    class Meta:
        model = IssueComments
        fields = ("__all__")

        read_only_fields = (
            'comment_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class IssueAuctionSerializer(AuditSerializer):
    class Meta:
        model = IssueAuctions
        fields = ("__all__")

        read_only_fields = (
            'auction_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class IssueBidSerializer(AuditSerializer):
    class Meta:
        model = IssueBids
        fields = ("__all__")

        read_only_fields = (
            'bid_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class LabelSerializer(AuditSerializer):
    class Meta:
        model = Label
        fields = ("__all__")

        read_only_fields = (
            'label_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )
