from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Guardian, Senior
from .serializers import (
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
