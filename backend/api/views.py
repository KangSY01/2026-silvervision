from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ExerciseMission, Guardian, Senior
from .permissions import IsGuardianSelf, IsSeniorSelf
from .serializers import (
    ExerciseMissionCreateSerializer,
    ExerciseMissionSerializer,
    ExerciseMissionStatusUpdateSerializer,
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


class ExerciseMissionListCreateView(generics.ListCreateAPIView):
    """
    IsSeniorSelf가 URL의 senior_id와 토큰 본인이 일치하는지만 확인하므로,
    쿼리셋도 반드시 그 senior_id로 한 번 더 필터링해 다른 시니어의
    미션이 섞여 나오지 않게 한다.
    """
    permission_classes = (IsSeniorSelf,)

    def get_queryset(self):
        return ExerciseMission.objects.filter(
            senior_id=self.kwargs['senior_id']
        ).select_related('exercise')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExerciseMissionCreateSerializer
        return ExerciseMissionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # body에 담긴 senior 값과 URL의 senior_id가 다르더라도 URL 쪽을
        # 우선시해 무조건 request.user(=IsSeniorSelf로 이미 본인 확인된
        # 시니어)로 덮어쓴다. IsSeniorSelf가 URL senior_id == 본인임을
        # 보장하므로 body 값을 신뢰할 이유가 없고, 불일치를 에러로
        # 처리하면 클라이언트가 매번 URL과 동일한 값을 body에도 넣어야
        # 하는 불필요한 제약만 생긴다.
        mission = serializer.save(senior=request.user)
        output = ExerciseMissionSerializer(mission)
        return Response(output.data, status=status.HTTP_201_CREATED)


class ExerciseMissionStatusUpdateView(generics.UpdateAPIView):
    """
    status만 변경하는 PATCH 전용 엔드포인트. mission_id가 URL의
    senior_id 소속이 아니면(다른 시니어의 미션 id를 넣은 경우)
    get_queryset()의 필터링 때문에 애초에 조회되지 않아 404가 된다.
    senior_id 자체가 본인이 아닌 경우는 IsSeniorSelf가 403으로 먼저
    막는다 - "존재하지 않는 자원"과 "권한 없음"을 계층별로 분리한
    형태다.
    """
    serializer_class = ExerciseMissionStatusUpdateSerializer
    permission_classes = (IsSeniorSelf,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'mission_id'
    http_method_names = ['patch']

    def get_queryset(self):
        return ExerciseMission.objects.filter(
            senior_id=self.kwargs['senior_id']
        )
