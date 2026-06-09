from rest_framework import serializers


class AgentAnalysisRequestSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=False)
    question = serializers.CharField(max_length=2000)
    top_k = serializers.IntegerField(min_value=1, max_value=10, required=False, default=5)


class AgentContextSnippetSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.JSONField(required=False)
    score = serializers.FloatField(required=False)
    text = serializers.CharField()
    title = serializers.CharField(required=False, allow_blank=True)


class AgentProjectStatsSerializer(serializers.Serializer):
    active_auctions = serializers.IntegerField()
    active_sprints = serializers.IntegerField()
    issues = serializers.IntegerField()
    name = serializers.CharField()
    open_issues = serializers.IntegerField()
    project_id = serializers.CharField()
    risks = serializers.IntegerField()
    status = serializers.CharField()


class AgentWorkspaceStatsSerializer(serializers.Serializer):
    active_auctions = serializers.IntegerField()
    active_sprints = serializers.IntegerField()
    issues_by_status = serializers.JSONField()
    open_issues = serializers.IntegerField()
    project_count = serializers.IntegerField()
    project_status_breakdown = serializers.JSONField()
    projects = AgentProjectStatsSerializer(many=True)
    total_issues = serializers.IntegerField()
    total_risks = serializers.IntegerField()


class AgentAnalysisResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    context_snippets = AgentContextSnippetSerializer(many=True)
    llm_model = serializers.CharField(required=False, allow_blank=True)
    llm_provider = serializers.CharField(required=False, allow_blank=True)
    mode = serializers.ChoiceField(choices=['preview', 'llm'])
    question = serializers.CharField()
    rag_enabled = serializers.BooleanField()
    stats = AgentWorkspaceStatsSerializer()
    warnings = serializers.ListField(child=serializers.CharField())


class AgentQdrantSyncResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    output = serializers.CharField(allow_blank=True)
