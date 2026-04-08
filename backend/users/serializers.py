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
            raise serializers.ValidationError(
                'No se pudo iniciar sesión con las credenciales indicadas.'
            )
        if not user.is_active:
            raise serializers.ValidationError('La cuenta de usuario está desactivada.')
        attrs['user'] = user
        return attrs
