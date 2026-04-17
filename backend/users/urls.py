from django.urls import path

from .views import AuthViewSet

app_name = 'users'

auth_login = AuthViewSet.as_view({'post': 'login'})
auth_logout = AuthViewSet.as_view({'post': 'logout'})
auth_logout_all = AuthViewSet.as_view({'post': 'logout_all'})
auth_me = AuthViewSet.as_view({'get': 'me'})
auth_sessions = AuthViewSet.as_view({'get': 'sessions'})

urlpatterns = [
    path('login/', auth_login, name='auth-login'),
    path('logout/', auth_logout, name='auth-logout'),
    path('logoutall/', auth_logout_all, name='auth-logout-all'),
    path('me/', auth_me, name='auth-me'),
    path('sessions/', auth_sessions, name='auth-sessions'),
]
