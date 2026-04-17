from rest_framework import serializers

from .models import Projects


class ProjectSerializer(serializers.ModelSerializer):
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
