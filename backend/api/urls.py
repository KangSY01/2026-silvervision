from django.urls import path

from . import views

app_name = 'api'

urlpatterns = [
    # 인증 관련 URL
    path(
        'auth/senior/register/', views.SeniorRegisterView.as_view(),
        name='senior-register',
    ),
    path(
        'auth/senior/login/', views.SeniorLoginView.as_view(),
        name='senior-login',
    ),
    path(
        'auth/guardian/register/', views.GuardianRegisterView.as_view(),
        name='guardian-register',
    ),
    path(
        'auth/guardian/login/', views.GuardianLoginView.as_view(),
        name='guardian-login',
    ),

    # 계정 관련 URL

    # 운동 관련 URL

    # 기록 관련 URL

    # 응급 관련 URL

    # 게임화 관련 URL
]
