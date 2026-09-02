from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    ActivityLog,
    CameraAccessGrant,
    EmergencyEvent,
    EmergencyNotification,
    Exercise,
    ExerciseMission,
    ExerciseSession,
    Guardian,
    GuardianSeniorMap,
    PhysicalAbilityLog,
    Senior,
)
from .gamification import latest_ranking, recalculate_rankings, recompute_fruit_count
from .permissions import IsGuardianSelf, IsSenior, IsSeniorOrGuardian, IsSeniorSelf
from .serializers import (
    ActivityLogSerializer,
    AlreadyRegistered,
    CameraAccessGrantSerializer,
    EmergencyEventDetailSerializer,
    EmergencyEventSerializer,
    EmergencyEventStatusUpdateSerializer,
    EmergencyNotificationSerializer,
    ExerciseMissionCreateSerializer,
    ExerciseMissionSerializer,
    ExerciseMissionStatusUpdateSerializer,
    ExerciseSerializer,
    ExerciseSessionCompleteSerializer,
    ExerciseSessionDetailSerializer,
    ExerciseSessionSerializer,
    ExerciseSessionStartSerializer,
    GuardianLoginSerializer,
    GuardianProfileSerializer,
    GuardianRegisterSerializer,
    GuardianSeniorMapCreateSerializer,
    GuardianSeniorMapSerializer,
    PhysicalAbilityLogSerializer,
    PoseFeedbackSerializer,
    RankingSnapshotSerializer,
    SeniorLoginSerializer,
    SeniorProfileSerializer,
    SeniorRegisterSerializer,
    is_valid_emergency_transition,
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


class GuardianSeniorListCreateView(generics.ListCreateAPIView):
    """
    GET  - 보호자 본인에게 등록된 피보호자 매핑 목록 (최신순).
    POST - 피보호자 신규 등록. body는 registered_via + (login_id | barcode_code)
           이며 서버가 senior를 조회한다 (GuardianSeniorMapCreateSerializer 참고).

    IsGuardianSelf가 URL guardian_id == 토큰 본인을 보장하고, get_queryset도
    그 guardian_id로 필터링해 다른 보호자의 매핑이 섞이지 않게 한다.
    """
    permission_classes = (IsGuardianSelf,)

    def get_queryset(self):
        return GuardianSeniorMap.objects.filter(
            guardian_id=self.kwargs['guardian_id']
        ).select_related('senior').order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return GuardianSeniorMapCreateSerializer
        return GuardianSeniorMapSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # IsGuardianSelf 통과 = request.user가 URL guardian_id 본인.
        context['guardian'] = self.request.user
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            mapping = serializer.save()
        except IntegrityError:
            # 시리얼라이저 validate()의 사전 중복 확인과 실제 저장 사이
            # 경합으로 unique_together가 걸리는 경우도 409로 통일한다.
            raise AlreadyRegistered()
        output = GuardianSeniorMapSerializer(mapping)
        return Response(output.data, status=status.HTTP_201_CREATED)


class GuardianSeniorDetailView(generics.DestroyAPIView):
    """
    DELETE - 보호자-피보호자 연결 해제. URL은 map_id가 아니라 senior_id로
    지정한다(클라이언트는 피보호자 목록에서 senior 기준으로 해제하므로).
    해당 보호자에게 그 피보호자가 연결돼 있지 않으면 404.
    """
    permission_classes = (IsGuardianSelf,)

    def get_queryset(self):
        return GuardianSeniorMap.objects.filter(
            guardian_id=self.kwargs['guardian_id']
        )

    def get_object(self):
        return get_object_or_404(
            self.get_queryset(), senior_id=self.kwargs['senior_id']
        )


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


class ExerciseSessionListCreateView(generics.ListCreateAPIView):
    """
    GET  - 이 시니어의 세션 목록 (최신순). IsSeniorSelf + get_queryset의
           senior_id 필터로 본인 세션만 나온다.
    POST - 세션 시작. body에서 mission만 받는다. senior_id 소속이 아닌
           mission을 보내면 ExerciseSessionStartSerializer.validate_mission이
           400으로 거부한다 (URL이 아니라 body로 들어온 참조값의 유효성
           문제라 403/404가 아닌 400을 택했다 - V6에서 URL 자체가 가리키는
           자원에 대한 권한 문제를 403/404로 구분한 것과는 다른 범주).
    """
    permission_classes = (IsSeniorSelf,)

    def get_queryset(self):
        return ExerciseSession.objects.filter(
            senior_id=self.kwargs['senior_id']
        ).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ExerciseSessionStartSerializer
        return ExerciseSessionSerializer

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


class ExerciseSessionDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   - 세션 상세 (연결된 pose_feedback 포함, ExerciseSessionDetailSerializer).
    PATCH - completion_rate/accuracy_avg 저장 (ExerciseSessionCompleteSerializer).
    session_id가 URL의 senior_id 소속이 아니면 get_queryset() 필터링 때문에
    조회되지 않아 404가 된다 (V6의 미션 PATCH와 동일한 기준).
    """
    permission_classes = (IsSeniorSelf,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'session_id'
    http_method_names = ['get', 'patch']

    def get_queryset(self):
        return ExerciseSession.objects.filter(
            senior_id=self.kwargs['senior_id']
        )

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return ExerciseSessionCompleteSerializer
        return ExerciseSessionDetailSerializer

    def perform_update(self, serializer):
        session = serializer.save()
        # completion_rate가 채워진 시점 = 세션 "완료 처리" 시점. 이때만
        # 게임화 보상/순위를 갱신한다. recompute_fruit_count·recalculate_rankings
        # 둘 다 멱등(전량 재계산)이라 같은 세션을 다시 PATCH해도 중복
        # 지급/오집계가 없다. 순위 산정 대상 시니어 수가 적은 규모라 매
        # 완료마다 그 날짜분을 전량 재계산하는 비용이 허용 가능하다고 판단했다
        # (부담이 커지면 manage.py recalculate_rankings로 배치 전환).
        if session.completion_rate is not None:
            recompute_fruit_count(session.senior)
            recalculate_rankings()


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


class ActivityLogListCreateView(generics.ListCreateAPIView):
    """
    기기 활동 로그(무활동 감지용) 저장/조회.

    GET  - 이 시니어의 로그를 최신순으로 반환한다. 무활동 판정은 결국
           "최근 일정 시간 안에 로그가 있는지"만 보는 용도라 전체 이력이
           필요 없고, 로그가 계속 쌓이면 응답이 비대해진다. 그래서 파라미터가
           없어도 기본 100건(최대 500건)으로 자르고, `?since=<ISO8601>`로
           기간을, `?limit=<n>`으로 건수를 조절한다. 다른 목록 API와
           마찬가지로 페이지네이션 래퍼 없이 평면 배열로 응답한다.
    POST - 로그 저장. 기기가 화면 On/Off·터치·가속도 이벤트를 짧은 주기로
           모아 보내는 특성상 단건(JSON object)과 여러 건(JSON array)을
           모두 받는다(SessionFeedbackCreateView와 동일한 bulk 패턴).
           senior는 URL의 senior_id 본인으로 강제 주입하고 activity_type만
           신뢰한다(logged_at은 auto_now_add라 서버가 채운다).

    senior_id 자체가 본인이 아니면 IsSeniorSelf가 403으로 먼저 막고,
    get_queryset도 senior_id로 필터링해 타인 로그가 섞이지 않게 한다.
    bulk_create라 MySQL에서는 POST 응답의 log_id가 채워지지 않을 수 있다
    (기기가 로그를 fire-and-forget로 보내는 용도라 ID 회신이 불필요).
    """
    permission_classes = (IsSeniorSelf,)
    serializer_class = ActivityLogSerializer

    DEFAULT_LIMIT = 100
    MAX_LIMIT = 500

    def _limit(self):
        raw = self.request.query_params.get('limit')
        if raw is None:
            return self.DEFAULT_LIMIT
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise ValidationError({'limit': '정수여야 합니다.'})
        if value < 1:
            raise ValidationError({'limit': '1 이상이어야 합니다.'})
        return min(value, self.MAX_LIMIT)

    def _since(self):
        raw = self.request.query_params.get('since')
        if raw is None:
            return None
        try:
            parsed = parse_datetime(raw)
        except ValueError:
            parsed = None
        if parsed is None:
            raise ValidationError(
                {'since': 'ISO 8601 형식이어야 합니다 (예: 2026-09-02T10:00:00Z).'}
            )
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
        return parsed

    def get_queryset(self):
        queryset = ActivityLog.objects.filter(
            senior_id=self.kwargs['senior_id']
        ).order_by('-logged_at')
        since = self._since()
        if since is not None:
            queryset = queryset.filter(logged_at__gte=since)
        return queryset[:self._limit()]

    def create(self, request, *args, **kwargs):
        items = request.data if isinstance(request.data, list) else [request.data]
        if not items or not all(isinstance(item, dict) for item in items):
            raise ValidationError('각 항목은 JSON 객체여야 하며 최소 1건이 필요합니다.')
        serializer = self.get_serializer(data=items, many=True)
        serializer.is_valid(raise_exception=True)
        # IsSeniorSelf 통과 = request.user가 URL senior_id 본인.
        serializer.save(senior=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PhysicalAbilityLogListCreateView(generics.ListCreateAPIView):
    """
    장기 신체 능력 추적(관절 가동범위·완성도)의 일별 기록 저장/조회.

    GET  - 이 시니어의 기록 전체를 logged_date 오름차순으로 반환한다.
           하루 최대 1건(unique_together)이라 1년치도 365건뿐 - activity-log
           와 달리 기간/건수 필터를 두지 않는다. 주/월 단위 추이 그래프가
           시간 오름차순으로 그려지므로 정렬도 오름차순으로 맞춘다(다른 목록
           API가 최신순인 것과 다른 이유).
    POST - 일별 점수 upsert. (senior, logged_date) unique 제약이 DB에 걸려
           있고, rom_score/completion_score는 그날 여러 세션을 거치며 마지막
           측정값으로 갱신될 수 있는 값이라, 같은 날 재요청을 409로 막기보다
           update_or_create로 덮어쓴다 - 새로 만들면 201, 기존 날짜를 갱신하면
           200. logged_date 생략 시 오늘로 채우고, senior는 URL 본인으로 강제
           주입한다.

    senior_id 자체가 본인이 아니면 IsSeniorSelf가 403으로 먼저 막고,
    get_queryset도 senior_id로 필터링해 타인 기록이 섞이지 않게 한다.
    """
    permission_classes = (IsSeniorSelf,)
    serializer_class = PhysicalAbilityLogSerializer

    def get_queryset(self):
        return PhysicalAbilityLog.objects.filter(
            senior_id=self.kwargs['senior_id']
        ).order_by('logged_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        logged_date = (
            serializer.validated_data.get('logged_date') or timezone.localdate()
        )
        # IsSeniorSelf 통과 = request.user가 URL senior_id 본인.
        instance, created = PhysicalAbilityLog.objects.update_or_create(
            senior=request.user,
            logged_date=logged_date,
            defaults={
                'rom_score': serializer.validated_data['rom_score'],
                'completion_score': serializer.validated_data['completion_score'],
            },
        )
        output = PhysicalAbilityLogSerializer(instance)
        return Response(
            output.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def _visible_emergency_events(user):
    """
    시니어 본인 소유 이벤트, 또는 guardian_senior_map으로 그 시니어와
    연결된 보호자에게 보이는 이벤트만 필터링한다. 이벤트 PATCH/notify/
    camera-grant 전부 이 쿼리셋으로 조회해 다른 시니어 소속 event_id
    접근 시 404가 되도록 통일한다(claude-security-guidance.md의 IDOR
    방지 규칙, V6·V7과 동일한 기준).
    """
    if isinstance(user, Senior):
        return EmergencyEvent.objects.filter(senior_id=user.senior_id)
    if isinstance(user, Guardian):
        senior_ids = GuardianSeniorMap.objects.filter(
            guardian=user
        ).values_list('senior_id', flat=True)
        return EmergencyEvent.objects.filter(senior_id__in=senior_ids)
    return EmergencyEvent.objects.none()


class EmergencyEventListCreateView(generics.ListCreateAPIView):
    """
    GET  - 요청자에게 보이는 이벤트 목록 (시니어 본인 것 또는
           guardian_senior_map으로 연결된 보호자에게 보이는 것, 최신순).
           _visible_emergency_events 쿼리셋을 그대로 재사용한다.
    POST - 이벤트 생성. AGENTS.md 기준 이벤트는 시니어 기기(비전 모델/
           센서)가 감지해 보내는 것이라 시니어 본인만 가능하다 - 목록은
           보호자도 봐야 하므로 method별로 권한을 나눈다.
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsSenior()]
        return [IsSeniorOrGuardian()]

    def get_serializer_class(self):
        # 목록·생성 응답 모두 EmergencyEventSerializer (기존 생성 응답 유지).
        return EmergencyEventSerializer

    def get_queryset(self):
        return _visible_emergency_events(self.request.user).order_by(
            '-created_at'
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(senior=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmergencyEventDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   - 이벤트 상세 (연결된 emergency_notification, camera_access_grant
            이력을 nested로 포함, EmergencyEventDetailSerializer).
    PATCH - status만 변경 (EmergencyEventStatusUpdateSerializer). 허용되지
            않는 상태 전이는 validate_status가 400으로 거부한다.
    시니어 본인 또는 연동된 보호자만 허용하고(claude-security-guidance.md),
    _visible_emergency_events 쿼리셋으로 조회해 다른 시니어 소속 event_id는
    404가 된다.
    """
    permission_classes = (IsSeniorOrGuardian,)
    lookup_field = 'pk'
    lookup_url_kwarg = 'event_id'
    http_method_names = ['get', 'patch']

    def get_queryset(self):
        return _visible_emergency_events(self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return EmergencyEventStatusUpdateSerializer
        return EmergencyEventDetailSerializer

    def get_queryset(self):
        return _visible_emergency_events(self.request.user)


class EmergencyNotifyView(APIView):
    """
    body의 guardian은 선택 - 생략하면 guardian_senior_map에 매핑된
    보호자 전원에게 각각 EmergencyNotification을 생성한다(실제
    응급상황에서는 연결된 보호자 모두에게 알리는 게 기본이어야 하므로).
    guardian을 지정하면 해당 시니어와 매핑된 보호자인지 검증하고,
    매핑 안 됐으면 400. 실제 FCM 발송/외부 연동은 범위 밖 - row 저장
    까지만 한다.

    성공 시 status를 notified로 전환한다(이미 notified면 멱등하게
    통과). first_check를 거치지 않은 상태(detected)이거나 이미
    종결된 상태(resolved/false_alarm)에서는 상태 전이 규칙 위반이라
    400으로 거부한다 - first_check로 먼저 PATCH한 뒤 notify를
    호출해야 한다.
    """
    permission_classes = (IsSeniorOrGuardian,)

    def post(self, request, event_id):
        event = get_object_or_404(
            _visible_emergency_events(request.user), pk=event_id,
        )

        target_status = EmergencyEvent.Status.NOTIFIED
        if event.status != target_status:
            if not is_valid_emergency_transition(event.status, target_status):
                return Response(
                    {
                        'detail': (
                            f'{event.status} 상태에서는 알림을 보낼 수 '
                            '없습니다. 먼저 first_check로 전환하세요.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            event.status = target_status
            event.save(update_fields=['status'])

        guardian_id = request.data.get('guardian')
        if guardian_id is not None:
            is_mapped = GuardianSeniorMap.objects.filter(
                senior_id=event.senior_id, guardian_id=guardian_id,
            ).exists()
            if not is_mapped:
                return Response(
                    {'detail': '해당 시니어와 연동되지 않은 보호자입니다.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            guardian_ids = [guardian_id]
        else:
            guardian_ids = list(
                GuardianSeniorMap.objects.filter(
                    senior_id=event.senior_id,
                ).values_list('guardian_id', flat=True)
            )

        notifications = [
            EmergencyNotification.objects.create(event=event, guardian_id=gid)
            for gid in guardian_ids
        ]
        output = EmergencyNotificationSerializer(notifications, many=True)
        return Response(output.data, status=status.HTTP_201_CREATED)


class CameraAccessGrantView(APIView):
    """
    POST - 카메라 접근 권한 부여. event는 URL에서, expires_at은 body에서
    받는다(CameraAccessGrantSerializer.validate_expires_at이 미래
    시각인지 검증).
    DELETE - row를 삭제하지 않고 expires_at을 현재 시각으로 당겨
    즉시 만료 처리한다. 응급 상황의 카메라 접근 이력은 감사 로그로
    남아야 한다고 판단해 삭제 대신 만료를 택했다. 해당 이벤트에 걸린
    활성 권한이 없으면 404.
    """
    permission_classes = (IsSeniorOrGuardian,)

    def post(self, request, event_id):
        event = get_object_or_404(
            _visible_emergency_events(request.user), pk=event_id,
        )
        serializer = CameraAccessGrantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grant = serializer.save(event=event)
        return Response(
            CameraAccessGrantSerializer(grant).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, event_id):
        event = get_object_or_404(
            _visible_emergency_events(request.user), pk=event_id,
        )
        now = timezone.now()
        active_grants = list(
            CameraAccessGrant.objects.filter(event=event, expires_at__gt=now)
        )
        if not active_grants:
            raise Http404
        for grant in active_grants:
            grant.expires_at = now
        CameraAccessGrant.objects.bulk_update(active_grants, ['expires_at'])
        output = CameraAccessGrantSerializer(active_grants, many=True)
        return Response(output.data, status=status.HTTP_200_OK)


class SeniorRankingView(APIView):
    """
    GET /senior/{senior_id}/ranking/ - 이 시니어의 최신 전국/지역 순위.

    응답은 scope별 최신 스냅샷을 나란히 담는다(전국/지역을 한 응답에 어떻게
    묶을지는 RankingSnapshotSerializer가 아니라 여기 views.py의 몫):

        {"national": {<snapshot>} | null, "regional": {<snapshot>} | null}

    스냅샷은 별도 스케줄러가 아니라 세션 완료(ExerciseSessionDetailView PATCH)
    시점에 gamification.recalculate_rankings()가 그 날짜분을 전량 upsert한다.
    아직 완료한 세션이 한 건도 없는 신규 시니어는 스냅샷이 없어 두 scope 모두
    null로 응답한다(200) - "순위 없음"은 오류가 아니라 정상 상태이고, 클라이언트
    입장에서도 404 분기보다 null 처리가 단순하다.

    권한은 IsSeniorSelf 재사용 - URL senior_id가 토큰 본인과 다르면 403.
    """
    permission_classes = (IsSeniorSelf,)

    def get(self, request, senior_id):
        snapshots = latest_ranking(request.user)
        return Response({
            scope: RankingSnapshotSerializer(snapshot).data if snapshot else None
            for scope, snapshot in snapshots.items()
        })
