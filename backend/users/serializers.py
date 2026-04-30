from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import PointTransaction, RouletteSpin

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


class PointTransactionSerializer(serializers.ModelSerializer):
    def validate_points(self, value):
        if value == 0:
            raise serializers.ValidationError('Los puntos no pueden ser 0.')
        return value

    def validate_type(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('El tipo de transaccion es requerido.')
        return value

    class Meta:
        model = PointTransaction
        fields = (
            'transaction_id',
            'user',
            'points',
            'type',
            'issue_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )
        read_only_fields = (
            'transaction_id',
            'user',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )

class RouletteSpinSerializer(serializers.ModelSerializer):
    def validate_points_won(self, value):
        if value < 0:
            raise serializers.ValidationError('Los puntos ganados no pueden ser negativos.')
        return value

    def validate_spin_cost(self, value):
        if value <= 0:
            raise serializers.ValidationError('El costo del giro debe ser mayor que 0.')
        return value

    class Meta:
        model = RouletteSpin
        fields = (
            'spin_id',
            'user',
            'points_won',
            'spin_cost',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )
        read_only_fields = (
            'spin_id',
            'user',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        )


class RouletteSpinRequestSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    option = serializers.ChoiceField(choices=('red', 'black', 'green', 'even', 'odd', 'low', 'high'))


class RouletteSpinResultSerializer(serializers.Serializer):
    spin_id = serializers.UUIDField()
    amount = serializers.IntegerField()
    option = serializers.CharField()
    result = serializers.IntegerField()
    color = serializers.ChoiceField(choices=('green', 'red', 'black'))
    won = serializers.BooleanField()
    multiplier = serializers.IntegerField()
    payout = serializers.IntegerField()
    balance_after = serializers.IntegerField()
    created_at = serializers.DateTimeField()