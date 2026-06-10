from django.urls import path

from .views import AuthViewSet, PointTransactionViewSet, RouletteSpinViewSet, UserViewSet

app_name = 'users'

auth_login = AuthViewSet.as_view({'post': 'login'})
auth_logout = AuthViewSet.as_view({'post': 'logout'})
auth_logout_all = AuthViewSet.as_view({'post': 'logout_all'})
auth_me = AuthViewSet.as_view({'get': 'me'})
auth_sessions = AuthViewSet.as_view({'get': 'sessions'})
users_list = UserViewSet.as_view({'get': 'list', 'post': 'create'})
users_detail = UserViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'})
roulette_spin = RouletteSpinViewSet.as_view({'post': 'spin'})
roulette_spins = RouletteSpinViewSet.as_view({'get': 'list'})
point_transactions = PointTransactionViewSet.as_view({'get': 'list'})

urlpatterns = [
    path('login/', auth_login, name='auth-login'),
    path('logout/', auth_logout, name='auth-logout'),
    path('logoutall/', auth_logout_all, name='auth-logout-all'),
    path('me/', auth_me, name='auth-me'),
    path('sessions/', auth_sessions, name='auth-sessions'),
    path('users/', users_list, name='user-list'),
    path('users/<int:pk>/', users_detail, name='user-detail'),
    path('roulette/spin/', roulette_spin, name='roulette-spin'),
    path('roulette/spins/', roulette_spins, name='roulette-spins'),
    path('transactions/', point_transactions, name='point-transactions'),
]
