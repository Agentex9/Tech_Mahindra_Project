from uuid import uuid4

from django.db import models

class AuditModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ## TODO: Update later once users exists
    created_by = models.CharField(max_length=255, blank=True, null=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)

    def meta(self):
        abstract = True


## Project related Models


class Projects(AuditModel):
    status_choices = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
        ('Cancelled', 'Cancelled'),
    ]
    
    project_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    client = models.CharField(max_length=255, blank=True, null=True)
    project_type = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=255, choices=status_choices, default='Not Started')

    ## TODO: Update later once users exists
    project_manager = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name
    
class ProjectPlannings(AuditModel):
    planning_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='plannings')
    planned_start_date = models.DateField()
    planned_end_date = models.DateField()
    estimated_duration = models.IntegerField(help_text="Estimated duration in days")
    methodology = models.CharField(max_length=255, blank=True, null=True)
    estimated_sprint_count = models.IntegerField(help_text="Estimated number of sprints")
    scope_statement = models.TextField(blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.planned_start_date and self.planned_end_date:
            if self.planned_end_date < self.planned_start_date:
                raise ValueError("Planned end date cannot be before planned start date.")
            self.estimated_duration = (self.planned_end_date - self.planned_start_date).days
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Planning for {self.project.name}"
    
class ProjectFinancials(AuditModel):
    financial_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='financials')
    estimated_budget = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_monthly_cost = models.DecimalField(max_digits=12, decimal_places=2)
    billing_model = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Financials for {self.project.name}"

class ProjectRisks(AuditModel):
    risk_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    risk_name = models.CharField(max_length=255)
    risk_description = models.TextField(blank=True, null=True)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='risks')
    deviation_tolerance_percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="Acceptable deviation percentage")
    delay_weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="Weight for schedule delays")
    budget_weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="Weight for budget overruns")
    complexity_level = models.CharField(max_length=255, blank=True, null=True)
    external_dependencies = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Risk for {self.project.name}"

class Sprints(AuditModel):
    sprint_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=255, choices=project.status_choices, default='Not Started')

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValueError("Sprint end date cannot be before sprint start date.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Sprint {self.name} for {self.project.name}"


## Issues Related Models

class Issue(AuditModel):
    assignment_type_choices = [
        ('Manual', 'Manual'),
        ('Bidding', 'Bidding'),
    ]
    
    issue_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='issues')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    multimedia_attachments = models.FileField(upload_to='multimedia/', blank=True, null=True)
    issue_type = models.CharField(max_length=255, blank=True, null=True)
    story_points = models.IntegerField(blank=True, null=True)
    reward_points = models.IntegerField(blank=True, null=True)
    price_points = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    assignment_type = models.CharField(max_length=255, blank=True, null=True)
    priority = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=255, choices=project.status_choices, default='Not Started')
    
    ## TODO: Update later once users exists
    informed_by = models.CharField(max_length=255)
    assigned_to = models.CharField(max_length=255, blank=True, null=True)

    due_date = models.DateField(blank=True, null=True)
    labels = models.ManyToManyField('label', blank=True, related_name='issues')

    def save(self, *args, **kwargs):
        if self.due_date and self.created_at:
            if self.due_date < self.created_at.date():
                raise ValueError("Due date cannot be before the issue creation date.")
        self.informed_by = self.created_by
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Issue {self.title} for {self.project.name}"
    
class Label(AuditModel):
    label_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=7, blank=True, null=True)  # Hex color code
    project = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name='labels')
    def __str__(self):
        return f"Label {self.name} for {self.project.name}"
    
class IssueComments(AuditModel):
    comment_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='comments')
    multimedia_attachments = models.FileField(upload_to='comment_multimedia/', blank=True, null=True)
    comment_text = models.TextField()
    

    def __str__(self):
        return f"Comment by {self.created_by} on Issue {self.issue.title}"

class IssueAuctions(AuditModel):
    action_status_choices = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    auction_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='auctions')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=255, choices=action_status_choices, default='Not Started')

    ## TODO: Update later once users exists
    winner = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                raise ValueError("Auction end date cannot be before auction start date.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Auction for Issue {self.issue.title} winner: {self.winner}"

class IssueBids(AuditModel):
    bid_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    auction = models.ForeignKey(IssueAuctions, on_delete=models.CASCADE, related_name='bids')
    bidder = models.CharField(max_length=255)  # TODO: Update later once users exists
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    bid_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bid by {self.bidder} for Auction {self.auction.auction_id}"