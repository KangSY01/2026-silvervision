import uuid

from rest_framework import serializers

from .models import (
    Exercise,
    ExerciseMission,
    ExerciseSession,
    Guardian,
    PhysicalAbilityLog,
    PoseFeedback,
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
