import uuid

from django.utils import timezone
from rest_framework import serializers

from .models import (
    ActivityLog,
    CameraAccessGrant,
    EmergencyEvent,
    EmergencyNotification,
    Exercise,
    ExerciseMission,
    ExerciseSession,
    Guardian,
    PhysicalAbilityLog,
    PoseFeedback,
    RankingSnapshot,
    Senior,
)


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


class ExerciseSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseSession
        fields = (
            'session_id', 'mission', 'senior', 'exercise',
            'completion_rate', 'accuracy_avg', 'created_at',
        )
        read_only_fields = ('session_id', 'created_at')


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
    이뤄진다.
    """
    class Meta:
        model = EmergencyEvent
        fields = (
            'event_id', 'senior', 'event_type', 'detection_source',
            'status', 'created_at',
        )
        read_only_fields = ('event_id', 'status', 'created_at')


class EmergencyEventStatusUpdateSerializer(serializers.ModelSerializer):
    """
    담당자/보호자 측 대응 흐름에서 status만 변경하기 위한 PATCH 전용
    시리얼라이저 (감지됨 -> 1차확인/오보/알림전송 -> 종료). 어떤 상태
    전이가 허용되는지(예: 종료된 이벤트를 다시 감지됨으로 되돌릴 수
    있는지)를 검증하는 전이 로직은 넣지 않았다 - 이는 AI 판별 로직은
    아니지만 별도의 비즈니스 규칙 확인이 필요해 범위 밖으로 뒀다.
    """
    class Meta:
        model = EmergencyEvent
        fields = ('event_id', 'status')
        read_only_fields = ('event_id',)


class EmergencyNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyNotification
        fields = ('notification_id', 'event', 'guardian', 'channel', 'sent_at')
        read_only_fields = ('notification_id', 'sent_at')


class CameraAccessGrantSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraAccessGrant
        fields = ('grant_id', 'event', 'granted_at', 'expires_at')
        read_only_fields = ('grant_id', 'granted_at')

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


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ('log_id', 'senior', 'activity_type', 'logged_at')
        read_only_fields = ('log_id', 'logged_at')


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
