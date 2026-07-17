from django.contrib import admin

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


@admin.register(Senior)
class SeniorAdmin(admin.ModelAdmin):
    list_display = (
        'senior_id', 'login_id', 'name', 'phone', 'mobility_level',
        'barcode_code', 'fruit_count', 'created_at',
    )
    search_fields = ('login_id', 'name', 'barcode_code')
    list_filter = ('mobility_level',)


@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display = ('guardian_id', 'login_id', 'name', 'phone', 'created_at')
    search_fields = ('login_id', 'name')


@admin.register(GuardianSeniorMap)
class GuardianSeniorMapAdmin(admin.ModelAdmin):
    list_display = (
        'map_id', 'guardian', 'senior', 'registered_via', 'created_at',
    )
    list_filter = ('registered_via',)


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('exercise_id', 'name', 'category', 'difficulty')
    search_fields = ('name', 'category')
    list_filter = ('category', 'difficulty')


@admin.register(ExerciseMission)
class ExerciseMissionAdmin(admin.ModelAdmin):
    list_display = (
        'mission_id', 'senior', 'exercise', 'scheduled_at', 'status',
    )
    list_filter = ('status',)


@admin.register(ExerciseSession)
class ExerciseSessionAdmin(admin.ModelAdmin):
    list_display = (
        'session_id', 'senior', 'exercise', 'mission',
        'completion_rate', 'accuracy_avg', 'created_at',
    )


@admin.register(PoseFeedback)
class PoseFeedbackAdmin(admin.ModelAdmin):
    list_display = ('feedback_id', 'session', 'joint_name', 'deviation')


@admin.register(PhysicalAbilityLog)
class PhysicalAbilityLogAdmin(admin.ModelAdmin):
    list_display = (
        'log_id', 'senior', 'rom_score', 'completion_score', 'logged_date',
    )
    list_filter = ('logged_date',)


@admin.register(EmergencyEvent)
class EmergencyEventAdmin(admin.ModelAdmin):
    list_display = (
        'event_id', 'senior', 'event_type', 'detection_source',
        'status', 'created_at',
    )
    list_filter = ('event_type', 'status')


@admin.register(EmergencyNotification)
class EmergencyNotificationAdmin(admin.ModelAdmin):
    list_display = (
        'notification_id', 'event', 'guardian', 'channel', 'sent_at',
    )
    list_filter = ('channel',)


@admin.register(CameraAccessGrant)
class CameraAccessGrantAdmin(admin.ModelAdmin):
    list_display = ('grant_id', 'event', 'granted_at', 'expires_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('log_id', 'senior', 'activity_type', 'logged_at')
    list_filter = ('activity_type',)


@admin.register(RankingSnapshot)
class RankingSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        'snapshot_id', 'senior', 'rank_scope', 'rank_position', 'score',
        'snapshot_date',
    )
    list_filter = ('rank_scope', 'snapshot_date')
