from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'points_balance',
            'is_active',
            'is_staff',
        )
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs.get('username'),
            password=attrs.get('password'),
        )
        if not user:
            raise serializers.ValidationError('No se pudo iniciar sesion con las credenciales indicadas.')
        if not user.is_active:
            raise serializers.ValidationError('La cuenta de usuario esta desactivada.')
        attrs['user'] = user
        return attrs


class AuthSessionSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='session_metadata.id')
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField(source='expiry', allow_null=True)
    ip_address = serializers.IPAddressField(source='session_metadata.ip_address', allow_null=True)
    is_current = serializers.BooleanField()
    last_seen_at = serializers.DateTimeField(source='session_metadata.last_seen_at')
    token_key = serializers.CharField()
    user_agent = serializers.CharField(source='session_metadata.user_agent')
