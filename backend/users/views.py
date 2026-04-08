from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.db.models import Q
from django.utils import timezone
from knox.auth import TokenAuthentication
from knox.models import AuthToken
from knox.settings import knox_settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import DateTimeField

from .serializers import LoginSerializer, UserSerializer


def _format_expiry(instance):
    if instance.expiry is None:
        return None
    fmt = knox_settings.EXPIRY_DATETIME_FORMAT
    return DateTimeField(format=fmt).to_representation(instance.expiry)


class AuthViewSet(viewsets.ViewSet):
    """
    Autenticación Knox: login (JSON), logout, cierre de todas las sesiones y perfil actual.
    """

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        authentication_classes=[],
        url_path='login',
    )
    def login(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        limit = knox_settings.TOKEN_LIMIT_PER_USER
        if limit is not None:
            now = timezone.now()
            active = user.auth_token_set.filter(Q(expiry__gt=now) | Q(expiry__isnull=True))
            if active.count() >= limit:
                return Response(
                    {'error': 'Se alcanzó el máximo de sesiones permitidas para este usuario.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        instance, token = AuthToken.objects.create(
            user=user,
            expiry=knox_settings.TOKEN_TTL,
            prefix=knox_settings.TOKEN_PREFIX,
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

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsAuthenticated],
        authentication_classes=[TokenAuthentication],
        url_path='logout',
    )
    def logout(self, request):
        request._auth.delete()
        user_logged_out.send(sender=request.user.__class__, request=request, user=request.user)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsAuthenticated],
        authentication_classes=[TokenAuthentication],
        url_path='logoutall',
    )
    def logout_all(self, request):
        request.user.auth_token_set.all().delete()
        user_logged_out.send(sender=request.user.__class__, request=request, user=request.user)
        return Response(None, status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[IsAuthenticated],
        authentication_classes=[TokenAuthentication],
        url_path='me',
    )
    def me(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)


__all__ = ['AuthViewSet']
