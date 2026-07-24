from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Exercise, ExerciseMission, ExerciseSession, Guardian, Senior
from .permissions import IsGuardianSelf, IsSeniorSelf
from .serializers import (
    ExerciseMissionCreateSerializer,
    ExerciseMissionSerializer,
    ExerciseMissionStatusUpdateSerializer,
    ExerciseSerializer,
    ExerciseSessionCompleteSerializer,
    ExerciseSessionSerializer,
    ExerciseSessionStartSerializer,
    GuardianLoginSerializer,
    GuardianProfileSerializer,
    GuardianRegisterSerializer,
    PoseFeedbackSerializer,
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
    운동 콘텐츠 마스터 목록 조회. 개인정보나 소유권과 무관한 공용 데이터라
    IsOwnerSelf류 검증은 필요 없다. 로그인 전 미리보기 화면 계획이 없어
    (frontend/AGENTS.md 기준 ExerciseSelect는 로그인 이후 SeniorHome
    아래에서만 진입) AllowAny로 열어둘 이유가 약하다고 판단해
    IsAuthenticated로 좁혔다 - 시니어/보호자 어느 역할이든 로그인만
    했으면 조회 가능하다(역할별로 막을 이유가 없는 공용 마스터 데이터).

    목록/상세를 별도 시리얼라이저로 나누지 않고 ExerciseSerializer를
    그대로 재사용한다. reference_angles는 관절 각도 몇 개짜리 작은 JSON일
    뿐 이미지·영상 같은 무거운 데이터가 아니고, 운동 콘텐츠 자체도 소수인
    마스터 테이블이라 목록에서 뺐다가 상세에서 다시 채우는 이원화가 실익
    없는 과최적화라고 판단했다. (ExerciseMinimalSerializer는 이 엔드포인트
    가 아니라 ExerciseMission에 중첩 표시할 때 쓰는 별도 목적의 축약형
    이라 여기서는 재사용하지 않는다.)
    """
    queryset = Exercise.objects.all().order_by('exercise_id')
    serializer_class = ExerciseSerializer
    permission_classes = (IsAuthenticated,)


class ExerciseDetailView(generics.RetrieveAPIView):
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
    permission_classes = (IsAuthenticated,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'exercise_id'


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


class ExerciseSessionStartView(generics.CreateAPIView):
    """
    body에서 mission만 받는다. senior_id 소속이 아닌 mission을 보내면
    ExerciseSessionStartSerializer.validate_mission이 400으로 거부한다
    (URL이 아니라 body로 들어온 참조값의 유효성 문제라 403/404가 아닌
    400을 택했다 - V6에서 URL 자체가 가리키는 자원에 대한 권한 문제를
    403/404로 구분한 것과는 다른 범주).
    """
    serializer_class = ExerciseSessionStartSerializer
    permission_classes = (IsSeniorSelf,)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['senior_id'] = self.kwargs['senior_id']
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mission = serializer.validated_data['mission']
        session = serializer.save(
            senior=request.user, exercise=mission.exercise,
        )
        output = ExerciseSessionSerializer(session)
        return Response(output.data, status=status.HTTP_201_CREATED)


class ExerciseSessionCompleteView(generics.UpdateAPIView):
    """
    completion_rate/accuracy_avg 저장 전용 PATCH. session_id가 URL의
    senior_id 소속이 아니면 get_queryset() 필터링 때문에 조회되지 않아
    404가 된다 (V6의 미션 PATCH와 동일한 기준).
    """
    serializer_class = ExerciseSessionCompleteSerializer
    permission_classes = (IsSeniorSelf,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'session_id'
    http_method_names = ['patch']

    def get_queryset(self):
        return ExerciseSession.objects.filter(
            senior_id=self.kwargs['senior_id']
        )


class SessionFeedbackCreateView(generics.CreateAPIView):
    """
    관절별 편차 여러 건을 한 번에 저장한다(PoseFeedbackListSerializer
    재사용, bulk_create). 세션이 이미 종료(completion_rate 등이 채워짐)
    됐는지는 확인하지 않는다 - 실제 사용 흐름상 피드백은 운동 도중
    실시간으로 쌓이고 completion_rate/accuracy_avg는 끝난 뒤 한 번에
    보내는 것이 더 자연스러워서, 순서를 강제하면 그 흐름을 막을 뿐
    데이터 정합성 이점은 없다고 판단했다.

    각 항목의 session 값은 URL의 session_id로 강제 덮어써서(V6의
    "URL이 우선" 패턴과 동일) 클라이언트가 다른 세션에 피드백을
    끼워넣지 못하게 한다. session_id 자체가 URL의 senior_id 소속이
    아니면 404.
    """
    serializer_class = PoseFeedbackSerializer
    permission_classes = (IsSeniorSelf,)

    def create(self, request, *args, **kwargs):
        session = get_object_or_404(
            ExerciseSession,
            pk=self.kwargs['session_id'],
            senior_id=self.kwargs['senior_id'],
        )
        items = request.data if isinstance(request.data, list) else [request.data]
        payload = [
            {**item, 'session': session.session_id} for item in items
        ]
        serializer = self.get_serializer(data=payload, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
