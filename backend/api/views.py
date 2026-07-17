from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Exercise, Guardian, Senior
from .permissions import IsGuardianSelf, IsSeniorSelf
from .serializers import (
    ExerciseSerializer,
    GuardianLoginSerializer,
    GuardianProfileSerializer,
    GuardianRegisterSerializer,
    SeniorLoginSerializer,
    SeniorProfileSerializer,
    SeniorRegisterSerializer,
)

INVALID_CREDENTIALS_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.'


def _issue_tokens(role, user_id):
    refresh = RefreshToken()
    refresh['role'] = role
    refresh['user_id'] = user_id
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class SeniorRegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = SeniorRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        senior = serializer.save()
        return Response(
            SeniorProfileSerializer(senior).data,
            status=status.HTTP_201_CREATED,
        )


class SeniorLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = SeniorLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        senior = Senior.objects.filter(
            login_id=serializer.validated_data['login_id']
        ).first()
        # 계정 존재 여부를 유추할 수 없도록 아이디 미존재/비밀번호 불일치를
        # 동일한 401 메시지로 응답한다.
        if senior is None or not senior.check_password(
            serializer.validated_data['password']
        ):
            return Response(
                {'detail': INVALID_CREDENTIALS_MESSAGE},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(_issue_tokens('senior', senior.senior_id))


class GuardianRegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = GuardianRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guardian = serializer.save()
        return Response(
            GuardianProfileSerializer(guardian).data,
            status=status.HTTP_201_CREATED,
        )


class GuardianLoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = GuardianLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        guardian = Guardian.objects.filter(
            login_id=serializer.validated_data['login_id']
        ).first()
        if guardian is None or not guardian.check_password(
            serializer.validated_data['password']
        ):
            return Response(
                {'detail': INVALID_CREDENTIALS_MESSAGE},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(_issue_tokens('guardian', guardian.guardian_id))


class SeniorDetailView(generics.RetrieveUpdateAPIView):
    """
    본인 프로필 조회/수정. IsSeniorSelf가 role(Senior)과 URL의
    senior_id가 토큰 본인과 일치하는지 함께 검증하므로, 다른 시니어의
    id로 접근하면 403(권한 있음/본인 아님)으로 거부된다. 토큰 자체가
    없거나 유효하지 않으면 DRF가 자동으로 401을 반환한다(인증 실패와
    권한 거부를 구분하는 표준 동작).
    """
    queryset = Senior.objects.all()
    serializer_class = SeniorProfileSerializer
    permission_classes = (IsSeniorSelf,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'senior_id'


class GuardianDetailView(generics.RetrieveUpdateAPIView):
    queryset = Guardian.objects.all()
    serializer_class = GuardianProfileSerializer
    permission_classes = (IsGuardianSelf,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'guardian_id'


class ExerciseListView(generics.ListAPIView):
    """
    운동 콘텐츠는 특정 사용자에 종속되지 않는 공개 마스터 데이터라
    로그인 없이도 조회 가능하게 한다 (claude-security-guidance.md가
    보호를 요구하는 대상은 비밀번호 해시/응급 데이터/카메라 접근 권한
    등이며 운동 콘텐츠는 해당하지 않는다).
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = (AllowAny,)


class ExerciseDetailView(generics.RetrieveAPIView):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = (AllowAny,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'exercise_id'
