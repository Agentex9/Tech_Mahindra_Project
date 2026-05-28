from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, OpenApiRequest, OpenApiResponse, extend_schema
from knox.auth import TokenAuthentication
from knox.models import AuthToken
from knox.settings import knox_settings
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import DateTimeField

from .models import AuthSession, PointTransaction, RouletteSpin, User
from .serializers import (
    AuthSessionSerializer,
    LoginSerializer,
    PointTransactionSerializer,
    RouletteSpinRequestSerializer,
    RouletteSpinResultSerializer,
    RouletteSpinSerializer,
    UserSerializer,
    UserWriteSerializer,
)


def _format_expiry(instance):
    if instance.expiry is None:
        return None

    return DateTimeField(format=knox_settings.EXPIRY_DATETIME_FORMAT).to_representation(instance.expiry)


class AdminUserPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_admin_role', False))


class UserViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by('id')
    authentication_classes = [TokenAuthentication]
    permission_classes = [AdminUserPermission]

    def get_serializer_class(self):
        if self.action in {'create', 'update', 'partial_update'}:
            return UserWriteSerializer
        return UserSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class AuthLoginResponseSerializer(serializers.Serializer):
    expiry = serializers.CharField(allow_null=True)
    token = serializers.CharField()
    user = UserSerializer()


class AuthLoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class AuthViewSet(viewsets.GenericViewSet):
    serializer_class = LoginSerializer

    def get_serializer_class(self):
        if getattr(self, 'action', None) == 'sessions':
            return AuthSessionSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        action = getattr(self, 'action', None)
        if action == 'login':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_authenticators(self):
        action = getattr(self, 'action', None)
        if action == 'login':
            return []
        return [TokenAuthentication()]

    def _get_client_ip(self, request):
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def _get_device_label(self, request):
        raw_user_agent = request.META.get('HTTP_USER_AGENT', '')
        normalized = raw_user_agent.lower()

        browser = 'Browser'
        if 'edg/' in normalized:
            browser = 'Edge'
        elif 'chrome/' in normalized and 'edg/' not in normalized:
            browser = 'Chrome'
        elif 'firefox/' in normalized:
            browser = 'Firefox'
        elif 'safari/' in normalized and 'chrome/' not in normalized:
            browser = 'Safari'

        platform = 'Unknown OS'
        if 'windows' in normalized:
            platform = 'Windows'
        elif 'mac os x' in normalized or 'macintosh' in normalized:
            platform = 'macOS'
        elif 'android' in normalized:
            platform = 'Android'
        elif 'iphone' in normalized or 'ipad' in normalized or 'ios' in normalized:
            platform = 'iOS'
        elif 'linux' in normalized:
            platform = 'Linux'

        device = 'Desktop'
        if 'mobile' in normalized or 'iphone' in normalized or 'android' in normalized:
            device = 'Mobile'
        elif 'ipad' in normalized or 'tablet' in normalized:
            device = 'Tablet'

        return f'{browser} on {platform} ({device})'

    @extend_schema(
        request=OpenApiRequest(
            request=AuthLoginRequestSerializer,
            examples=[
                OpenApiExample(
                    'Login payload',
                    value={'username': 'admin', 'password': 'admin123'},
                    request_only=True,
                )
            ],
        ),
        responses={
            200: AuthLoginResponseSerializer,
            400: OpenApiResponse(description='Credenciales invalidas o datos incompletos.'),
        },
        tags=['Auth'],
        summary='Iniciar sesion',
        description='Autentica al usuario con username y password y devuelve un token Knox.',
    )
    def login(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        limit = 3
        now = timezone.now()
        active = user.auth_token_set.filter(Q(expiry__gt=now) | Q(expiry__isnull=True)).order_by('created')
        while active.count() >= limit:
            oldest = active.first()
            if oldest is None:
                break
            oldest.delete()
            active = user.auth_token_set.filter(Q(expiry__gt=now) | Q(expiry__isnull=True)).order_by('created')

        instance, token = AuthToken.objects.create(
            user=user,
            expiry=knox_settings.TOKEN_TTL,
            prefix=knox_settings.TOKEN_PREFIX,
        )
        AuthSession.objects.create(
            token=instance,
            user=user,
            ip_address=self._get_client_ip(request),
            user_agent=self._get_device_label(request),
        )
        user_logged_in.send(sender=user.__class__, request=request, user=user)

        return Response(
            {
                'expiry': _format_expiry(instance),
                'token': token,
                'user': UserSerializer(user, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses={204: OpenApiResponse(description='Sesion cerrada.')},
        tags=['Auth'],
        summary='Cerrar sesion',
    )
    def logout(self, request):
        request._auth.delete()
        user_logged_out.send(sender=request.user.__class__, request=request, user=request.user)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=None,
        responses={204: OpenApiResponse(description='Todas las sesiones fueron cerradas.')},
        tags=['Auth'],
        summary='Cerrar todas las sesiones',
    )
    def logout_all(self, request):
        request.user.auth_token_set.all().delete()
        user_logged_out.send(sender=request.user.__class__, request=request, user=request.user)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        responses={200: UserSerializer},
        tags=['Auth'],
        summary='Obtener usuario autenticado',
    )
    def me(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    @extend_schema(
        responses={200: AuthSessionSerializer(many=True)},
        tags=['Auth'],
        summary='Listar sesiones activas',
        description='Devuelve las sesiones activas del usuario autenticado con metadata registrada.',
    )
    def sessions(self, request):
        sessions = (
            request.user.auth_token_set.filter(Q(expiry__gt=timezone.now()) | Q(expiry__isnull=True))
            .select_related('session_metadata')
            .order_by('-created')
        )
        current_token_id = getattr(request._auth, 'pk', None)
        payload = []

        for token in sessions:
            if not hasattr(token, 'session_metadata'):
                continue
            payload.append(
                {
                    'created_at': token.created,
                    'expiry': token.expiry,
                    'is_current': token.pk == current_token_id,
                    'session_metadata': token.session_metadata,
                    'token_key': token.token_key,
                }
            )

        serializer = self.get_serializer(payload, many=True)
        return Response(serializer.data)


__all__ = ['UserViewSet', 'AuthViewSet']


class RouletteSpinViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RouletteSpinSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RouletteSpin.objects.filter(user=self.request.user).order_by('-created_at')

    def _wheel(self):
        return [
            {'value': 0, 'color': 'green'},
            {'value': 1, 'color': 'red'},
            {'value': 2, 'color': 'black'},
            {'value': 3, 'color': 'red'},
            {'value': 4, 'color': 'black'},
            {'value': 5, 'color': 'red'},
            {'value': 6, 'color': 'black'},
            {'value': 7, 'color': 'red'},
            {'value': 8, 'color': 'black'},
            {'value': 9, 'color': 'red'},
            {'value': 10, 'color': 'black'},
            {'value': 11, 'color': 'red'},
            {'value': 12, 'color': 'black'},
        ]

    def _is_winning(self, option: str, slot: dict) -> bool:
        value = slot['value']
        color = slot['color']

        if option == 'red':
            return color == 'red'
        if option == 'black':
            return color == 'black'
        if option == 'green':
            return color == 'green'
        if option == 'even':
            return value != 0 and value % 2 == 0
        if option == 'odd':
            return value % 2 == 1
        if option == 'low':
            return 1 <= value <= 6
        if option == 'high':
            return 7 <= value <= 12
        return False

    @extend_schema(
        request=RouletteSpinRequestSerializer,
        responses={200: RouletteSpinResultSerializer, 400: OpenApiResponse(description='Apuesta invalida.')},
        tags=['Roulette'],
        summary='Girar ruleta',
        description='Descuenta la apuesta, calcula el resultado y registra la transaccion en el backend.',
    )
    @action(detail=False, methods=['post'], url_path='spin')
    def spin(self, request):
        import random

        payload = RouletteSpinRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        amount = payload.validated_data['amount']
        option = payload.validated_data['option']

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)

            if amount > user.points_balance:
                return Response({'detail': 'No tienes puntos suficientes para esa apuesta.'}, status=status.HTTP_400_BAD_REQUEST)

            wheel = self._wheel()
            slot = random.choice(wheel)
            won = self._is_winning(option, slot)
            multiplier = 14 if option == 'green' else 2
            payout = amount * multiplier if won else 0
            balance_after = user.points_balance - amount + payout

            user.points_balance = balance_after
            user.updated_by = user
            user.save(update_fields=['points_balance', 'updated_at', 'updated_by'])

            spin = RouletteSpin.objects.create(
                user=user,
                points_won=payout,
                spin_cost=amount,
                created_by=user,
                updated_by=user,
            )

            PointTransaction.objects.create(
                user=user,
                points=-amount,
                type='roulette_spin_cost',
                issue_id=None,
                created_by=user,
                updated_by=user,
            )
            if payout:
                PointTransaction.objects.create(
                    user=user,
                    points=payout,
                    type='roulette_payout',
                    issue_id=None,
                    created_by=user,
                    updated_by=user,
                )

        result = {
            'spin_id': spin.spin_id,
            'amount': amount,
            'option': option,
            'result': slot['value'],
            'color': slot['color'],
            'won': won,
            'multiplier': multiplier,
            'payout': payout,
            'balance_after': balance_after,
            'created_at': spin.created_at,
        }
        return Response(RouletteSpinResultSerializer(result).data)


__all__ += ['RouletteSpinViewSet']


class PointTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PointTransactionSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PointTransaction.objects.filter(user=self.request.user).order_by('-created_at')


__all__ += ['PointTransactionViewSet']
