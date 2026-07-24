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
    path(
        'senior/<int:senior_id>/', views.SeniorDetailView.as_view(),
        name='senior-detail',
    ),
    path(
        'guardian/<int:guardian_id>/', views.GuardianDetailView.as_view(),
        name='guardian-detail',
    ),

    # 운동 관련 URL
    path('exercises/', views.ExerciseListView.as_view(), name='exercise-list'),
    path(
        'exercises/<int:exercise_id>/', views.ExerciseDetailView.as_view(),
        name='exercise-detail',
    ),
    path(
        'senior/<int:senior_id>/missions/',
        views.ExerciseMissionListCreateView.as_view(),
        name='senior-mission-list',
    ),
    path(
        'senior/<int:senior_id>/missions/<int:mission_id>/',
        views.ExerciseMissionStatusUpdateView.as_view(),
        name='senior-mission-status-update',
    ),

    # 기록 관련 URL
    path(
        'senior/<int:senior_id>/sessions/',
        views.ExerciseSessionStartView.as_view(),
        name='senior-session-start',
    ),
    path(
        'senior/<int:senior_id>/sessions/<int:session_id>/',
        views.ExerciseSessionCompleteView.as_view(),
        name='senior-session-complete',
    ),
    path(
        'senior/<int:senior_id>/sessions/<int:session_id>/feedback/',
        views.SessionFeedbackCreateView.as_view(),
        name='senior-session-feedback',
    ),

    # 응급 관련 URL

    # 게임화 관련 URL
]
