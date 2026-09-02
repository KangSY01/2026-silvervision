import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, NotFound

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
    PoseFeedback,
    RankingSnapshot,
    Senior,
)


class AlreadyRegistered(APIException):
    """
    unique_together(guardian, senior) 위반(이미 등록된 피보호자를 다시
    등록 시도) 시 반환한다. 요청 형식·식별자 자체는 유효하고 리소스가
    이미 존재하는 상태 충돌이라 400(입력을 고쳐 재시도)이 아니라 409를
    택했다 - 클라이언트가 "이미 등록됨"과 "잘못된 바코드"를 상태 코드로
    구분해 다른 안내를 띄울 수 있다.
    """
    status_code = status.HTTP_409_CONFLICT
    default_detail = '이미 등록된 피보호자입니다.'
    default_code = 'already_registered'


def _generate_barcode_code():
    return uuid.uuid4().hex.upper()


class SeniorRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Senior
        fields = (
            'login_id', 'password', 'name', 'phone', 'address',
            'diseases', 'medication', 'mobility_level',
        )

    def validate_password(self, value):
        if value.isdigit() or value.isalpha():
            raise serializers.ValidationError(
                '비밀번호는 영문과 숫자를 함께 포함해야 합니다.'
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        senior = Senior(barcode_code=_generate_barcode_code(), **validated_data)
        senior.set_password(password)
        senior.save()
        return senior


class SeniorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Senior
        fields = (
            'login_id', 'name', 'phone', 'address', 'diseases',
            'medication', 'mobility_level', 'barcode_code', 'fruit_count',
        )
        read_only_fields = ('barcode_code', 'fruit_count')


class GuardianRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Guardian
        fields = ('login_id', 'password', 'name', 'phone', 'address')

    def validate_password(self, value):
        if value.isdigit() or value.isalpha():
            raise serializers.ValidationError(
                '비밀번호는 영문과 숫자를 함께 포함해야 합니다.'
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        guardian = Guardian(**validated_data)
        guardian.set_password(password)
        guardian.save()
        return guardian


class GuardianProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guardian
        fields = ('login_id', 'name', 'phone', 'address')


class SeniorLoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True)


class GuardianLoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True)


class MappedSeniorSerializer(serializers.ModelSerializer):
    """
    보호자-피보호자 매핑 목록에서 각 피보호자를 식별할 최소 정보만 노출한다.
    보호자는 `/senior/{id}/`(IsSeniorSelf)로 피보호자 프로필을 받을 수 없어
    이 요약이 보호자 쪽에서 피보호자 정보를 얻는 유일한 경로지만, 질환·
    복용약 같은 민감 정보는 목록 용도에 불필요하므로 제외한다.
    """
    class Meta:
        model = Senior
        fields = ('senior_id', 'login_id', 'name', 'phone', 'mobility_level')
        read_only_fields = fields


class GuardianSeniorMapSerializer(serializers.ModelSerializer):
    """매핑 조회용 - senior는 위 요약 시리얼라이저로 중첩한다."""
    senior = MappedSeniorSerializer(read_only=True)

    class Meta:
        model = GuardianSeniorMap
        fields = ('map_id', 'guardian', 'senior', 'registered_via', 'created_at')
        read_only_fields = fields


class GuardianSeniorMapCreateSerializer(serializers.Serializer):
    """
    등록 방식(registered_via)에 따라 **서버가** 피보호자를 조회한다.
    - id_search: `login_id`를 받아 `senior.login_id`로 조회
    - barcode:   `barcode_code`를 받아 `senior.barcode_code`로 조회

    두 값 모두 senior 테이블에 UNIQUE라 서버 조회가 모호하지 않고,
    클라이언트가 이미 조회한 senior_id를 그대로 신뢰하는 방식과 달리
    `registered_via`를 서버가 실제 조회 경로로 확정해 채울 수 있어 감사
    정보가 정확하다. (승인 절차는 스키마·화면에 없어 등록 즉시 연결된다.)
    """
    registered_via = serializers.ChoiceField(
        choices=GuardianSeniorMap.RegisteredVia.choices,
    )
    login_id = serializers.CharField(required=False)
    barcode_code = serializers.CharField(required=False)

    def validate(self, attrs):
        via = attrs['registered_via']
        Via = GuardianSeniorMap.RegisteredVia
        field = 'login_id' if via == Via.ID_SEARCH else 'barcode_code'
        value = attrs.get(field)
        if not value:
            raise serializers.ValidationError(
                {field: f'registered_via가 {via}일 때 {field}는 필수입니다.'}
            )

        try:
            senior = Senior.objects.get(**{field: value})
        except Senior.DoesNotExist:
            raise NotFound('해당 피보호자를 찾을 수 없습니다.')

        guardian = self.context['guardian']
        if GuardianSeniorMap.objects.filter(
            guardian=guardian, senior=senior
        ).exists():
            raise AlreadyRegistered()

        attrs['senior'] = senior
        return attrs

    def create(self, validated_data):
        return GuardianSeniorMap.objects.create(
            guardian=self.context['guardian'],
            senior=validated_data['senior'],
            registered_via=validated_data['registered_via'],
        )


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = (
            'exercise_id', 'name', 'category', 'difficulty',
            'guide_image_url', 'silhouette_url', 'reference_angles',
        )


class ExerciseMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = (
            'exercise_id', 'name', 'category', 'difficulty',
            'guide_image_url',
        )


class ExerciseMissionSerializer(serializers.ModelSerializer):
    exercise = ExerciseMinimalSerializer(read_only=True)

    class Meta:
        model = ExerciseMission
        fields = (
            'mission_id', 'senior', 'exercise', 'scheduled_at', 'status',
        )
        read_only_fields = ('mission_id', 'status')


class ExerciseMissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseMission
        fields = ('senior', 'exercise', 'scheduled_at')


class ExerciseMissionStatusUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH으로 status만 변경하기 위한 전용 시리얼라이저. status는 모델의
    choices(pending/completed/skipped)로 정의돼 있어 ModelSerializer가
    자동으로 유효하지 않은 값을 400으로 거부한다. senior/exercise/
    scheduled_at은 노출하지 않아 상태 변경 요청으로 다른 필드가 함께
    바뀔 수 없다.
    """
    class Meta:
        model = ExerciseMission
        fields = ('mission_id', 'status')
        read_only_fields = ('mission_id',)


class ExerciseSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSession
        fields = (
            'session_id', 'mission', 'senior', 'exercise',
            'completion_rate', 'accuracy_avg', 'created_at',
        )
        read_only_fields = ('session_id', 'created_at')


class ExerciseSessionStartSerializer(serializers.ModelSerializer):
    """
    세션 시작 시점엔 mission만 받는다. senior는 URL/토큰에서, exercise는
    mission.exercise에서 서버가 채운다(view에서 처리) - 클라이언트가
    mission과 다른 exercise를 보내 세션-미션이 불일치하는 상황을 막는다.
    completion_rate/accuracy_avg는 종료 전까지 알 수 없는 값이라 이
    시리얼라이저에는 포함하지 않는다.
    """
    class Meta:
        model = ExerciseSession
        fields = ('session_id', 'mission', 'senior', 'exercise', 'created_at')
        read_only_fields = ('session_id', 'senior', 'exercise', 'created_at')

    def validate_mission(self, value):
        senior_id = self.context.get('senior_id')
        if value.senior_id != senior_id:
            raise serializers.ValidationError(
                '해당 미션은 이 시니어 소속이 아닙니다.'
            )
        return value


class ExerciseSessionCompleteSerializer(serializers.ModelSerializer):
    """
    PATCH 전용 - completion_rate/accuracy_avg만 받는다. PATCH는 부분
    수정이 기본이라 두 필드 모두 optional로 두되(둘 중 하나만 먼저
    도착해도 처리 가능), 값이 오면 0~100 범위인지는 검증한다. AI가
    계산한 값을 그대로 신뢰하는 것과 별개로, 형태가 이상한 입력값
    (예: 150.00)까지 그대로 저장하는 건 시스템 경계에서의 일반적인
    입력 검증 문제라 여기 추가했다.
    """
    completion_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    accuracy_avg = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        model = ExerciseSession
        fields = ('session_id', 'completion_rate', 'accuracy_avg')
        read_only_fields = ('session_id',)


class PoseFeedbackListSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        instances = [PoseFeedback(**item) for item in validated_data]
        return PoseFeedback.objects.bulk_create(instances)


class PoseFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = PoseFeedback
        fields = ('feedback_id', 'session', 'joint_name', 'deviation')
        read_only_fields = ('feedback_id',)
        list_serializer_class = PoseFeedbackListSerializer


class ExerciseSessionDetailSerializer(serializers.ModelSerializer):
    """
    세션 단건 조회용. pose_feedback은 이 세션 밖에서 조회할 경로가 없어
    (독립 GET 엔드포인트 없음) 상세 응답에 nested로 내려준다. 세션당 관절
    몇 개짜리 소량이라 상세에서 인라인해도 부담이 없다 - 목록
    (ExerciseSessionSerializer)에는 넣지 않는다.
    """
    pose_feedbacks = PoseFeedbackSerializer(
        many=True, read_only=True, source='posefeedback_set',
    )

    class Meta:
        model = ExerciseSession
        fields = (
            'session_id', 'mission', 'senior', 'exercise',
            'completion_rate', 'accuracy_avg', 'created_at', 'pose_feedbacks',
        )
        read_only_fields = fields


class PhysicalAbilityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhysicalAbilityLog
        fields = (
            'log_id', 'senior', 'rom_score', 'completion_score',
            'logged_date',
        )
        read_only_fields = ('log_id',)


class EmergencyEventSerializer(serializers.ModelSerializer):
    """
    클라이언트(비전 모델/센서)가 낙상·무활동을 "감지했다"는 사실과 감지
    출처(detection_source)를 기록만 한다. 낙상/무활동 여부를 판별하는
    로직이나 임계치 계산은 AI 파트(온디바이스) 책임이며, 이 시리얼라이저
    에는 절대 포함하지 않는다 (AGENTS.md 3장 'AI 모델 경계' 참고).

    status는 모델 기본값('detected')에 맡기고 입력 필드에서 제외한다.
    클라이언트가 생성 요청에서 임의로 상태를 지정하지 못하게 하기 위함
    이며, 상태 변경은 EmergencyEventStatusUpdateSerializer를 통해서만
    이뤄진다. senior도 read-only로 두고 뷰에서 토큰 본인(request.user)
    으로 강제 주입한다 - URL에 senior_id가 없는 엔드포인트라 body의
    senior 값을 그대로 신뢰하면 다른 시니어 명의로 이벤트를 만들 수
    있는 IDOR이 된다.
    """
    class Meta:
        model = EmergencyEvent
        fields = (
            'event_id', 'senior', 'event_type', 'detection_source',
            'status', 'created_at',
        )
        read_only_fields = ('event_id', 'senior', 'status', 'created_at')


# 상태 전이 규칙 (확정): detected -> first_check -> (false_alarm | notified)
# -> resolved. 다이어그램에 없는 전이(예: detected에서 바로 resolved,
# resolved에서 다시 detected로 되돌리는 것 등)는 전부 허용하지 않는다.
# 같은 상태로의 재요청(멱등 재시도)은 전이로 취급하지 않고 허용한다.
EMERGENCY_EVENT_TRANSITIONS = {
    EmergencyEvent.Status.DETECTED: {EmergencyEvent.Status.FIRST_CHECK},
    EmergencyEvent.Status.FIRST_CHECK: {
        EmergencyEvent.Status.FALSE_ALARM, EmergencyEvent.Status.NOTIFIED,
    },
    EmergencyEvent.Status.FALSE_ALARM: {EmergencyEvent.Status.RESOLVED},
    EmergencyEvent.Status.NOTIFIED: {EmergencyEvent.Status.RESOLVED},
    EmergencyEvent.Status.RESOLVED: set(),
}


def is_valid_emergency_transition(current_status, new_status):
    if current_status == new_status:
        return True
    return new_status in EMERGENCY_EVENT_TRANSITIONS.get(current_status, set())


class EmergencyEventStatusUpdateSerializer(serializers.ModelSerializer):
    """
    담당자/보호자 측 대응 흐름에서 status만 변경하기 위한 PATCH 전용
    시리얼라이저 (감지됨 -> 1차확인 -> (오보|알림전송) -> 종료). 위
    EMERGENCY_EVENT_TRANSITIONS 표에 없는 전이는 400으로 거부한다.

    다만 EMERGENCY_EVENT_TRANSITIONS 표에는 first_check -> notified가
    허용 전이로 올라 있지만(EmergencyNotifyView가 is_valid_emergency_transition
    을 직접 호출할 때 재사용해야 하므로 표 자체는 건드리지 않는다), notified
    로의 전이는 실제 알림 발송(EmergencyNotification 생성)을 동반해야
    의미가 있다. 이 PATCH 엔드포인트로 직접 notified를 찍으면 상태만
    바뀌고 알림 이력 없이 "이미 알림을 보낸 것"처럼 보이는 상태가 될 수
    있어, 목표 상태가 notified인 경우는 표 조회 이전에 무조건 거부하고
    /notify/ 엔드포인트로만 도달하도록 막는다.
    """
    class Meta:
        model = EmergencyEvent
        fields = ('event_id', 'status')
        read_only_fields = ('event_id',)

    def validate_status(self, value):
        if value == EmergencyEvent.Status.NOTIFIED:
            raise serializers.ValidationError(
                'notified 상태로의 전이는 /notify/ 엔드포인트를 통해서만 '
                '가능합니다.'
            )
        current = self.instance.status if self.instance else None
        if current is not None and not is_valid_emergency_transition(
            current, value
        ):
            raise serializers.ValidationError(
                f'{current} 상태에서 {value}(으)로 바꿀 수 없습니다.'
            )
        return value


class EmergencyNotificationSerializer(serializers.ModelSerializer):
    """
    event/guardian 모두 read-only. event는 URL의 event_id에서, guardian은
    guardian_senior_map 조회(또는 검증된 body 값)에서 뷰가 채운다 -
    매핑되지 않은 보호자에게 알림이 가는 걸 시리얼라이저 레벨의 입력을
    신뢰하지 않는 방식으로 막는다.
    """
    class Meta:
        model = EmergencyNotification
        fields = ('notification_id', 'event', 'guardian', 'channel', 'sent_at')
        read_only_fields = ('notification_id', 'event', 'guardian', 'sent_at')


class CameraAccessGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraAccessGrant
        fields = ('grant_id', 'event', 'granted_at', 'expires_at')
        read_only_fields = ('grant_id', 'event', 'granted_at')

    def validate_expires_at(self, value):
        # granted_at은 auto_now_add라 저장 시점의 현재 시각으로 채워지므로,
        # expires_at이 "지금" 이후인지 확인하는 것이 granted_at 이후인지
        # 확인하는 것과 사실상 동일하다. 낙상 여부나 응급 상황을 판단하는
        # 로직이 아니라 만료 시각이 과거일 수 없다는 데이터 정합성만
        # 검증하는 것이라 AI 모델 경계 밖의 일반적인 입력 검증으로 판단했다.
        if value <= timezone.now():
            raise serializers.ValidationError(
                'expires_at은 현재 시각 이후여야 합니다.'
            )
        return value


class EmergencyEventDetailSerializer(serializers.ModelSerializer):
    """
    이벤트 단건 조회용. 알림 발송 이력(emergency_notification)과 카메라
    접근 권한 이력(camera_access_grant)은 독립 조회 엔드포인트가 없어
    이벤트 상세에 nested로 포함한다 - 목록(EmergencyEventSerializer)에는
    넣지 않는다.
    """
    notifications = EmergencyNotificationSerializer(
        many=True, read_only=True, source='emergencynotification_set',
    )
    camera_grants = CameraAccessGrantSerializer(
        many=True, read_only=True, source='cameraaccessgrant_set',
    )

    class Meta:
        model = EmergencyEvent
        fields = (
            'event_id', 'senior', 'event_type', 'detection_source',
            'status', 'created_at', 'notifications', 'camera_grants',
        )
        read_only_fields = fields


class ActivityLogListSerializer(serializers.ListSerializer):
    """기기가 화면 On/Off·터치·가속도 이벤트를 짧은 주기로 모아 보내는
    특성상 여러 건을 한 번에 저장한다(PoseFeedbackListSerializer와 동일한
    bulk_create 패턴)."""
    def create(self, validated_data):
        instances = [ActivityLog(**item) for item in validated_data]
        return ActivityLog.objects.bulk_create(instances)


class ActivityLogSerializer(serializers.ModelSerializer):
    """
    activity_type은 모델의 CharField(max_length=100) 자유 문자열을 그대로
    노출한다 - choices로 잠그지 않는다. 어떤 이벤트 종류(screen_on/off,
    touch, accelerometer, …)가 오는지는 기기/AI 파트가 정하고 센서가
    추가될 때마다 늘 수 있어(AGENTS.md 3장 'AI 모델 경계'), 백엔드에서
    enum으로 고정하면 값이 늘 때마다 마이그레이션·배포가 필요해진다.
    빈 문자열은 CharField 기본 검증(allow_blank=False)이 400으로 거부한다.

    senior는 read-only - 뷰에서 URL의 senior_id 본인(request.user)으로
    강제 주입한다(다른 시니어 명의로 로그를 남기는 IDOR 방지, views.py의
    'URL·토큰이 body보다 우선' 규칙). logged_at은 auto_now_add.
    """
    class Meta:
        model = ActivityLog
        fields = ('log_id', 'senior', 'activity_type', 'logged_at')
        read_only_fields = ('log_id', 'senior', 'logged_at')
        list_serializer_class = ActivityLogListSerializer


class RankingSnapshotSerializer(serializers.ModelSerializer):
    """
    조회 전용: 이미 배치 프로세스가 계산해 저장해 둔 순위 스냅샷 한 건을
    그대로 노출할 뿐, 점수/순위를 산정하는 로직은 포함하지 않는다.

    이건 AGENTS.md 3장의 'AI 모델 경계'와는 다른 종류의 경계다 - 저기서
    빠지는 건 온디바이스 AI(낙상 판별 등)의 몫이고, 여기서 빠지는 건
    별도 배치 프로세스(순위 집계 쿼리/스케줄 작업)의 몫이다. 다만
    "백엔드는 이미 계산된 결과값만 저장·조회한다"는 원칙 자체는 동일하게
    적용된다.

    전국/지역 순위를 한 응답에 어떻게 묶어 보여줄지(별도 필드 vs 배열)는
    이 시리얼라이저가 아니라 이를 사용하는 views.py의 몫이라 여기서는
    스냅샷 레코드 하나만 표현한다.
    """
    class Meta:
        model = RankingSnapshot
        fields = (
            'snapshot_id', 'senior', 'score', 'snapshot_date',
            'rank_scope', 'rank_position',
        )
        read_only_fields = (
            'snapshot_id', 'senior', 'score', 'snapshot_date',
            'rank_scope', 'rank_position',
        )
