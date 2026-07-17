from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class Senior(models.Model):
    class MobilityLevel(models.TextChoices):
        INDEPENDENT = 'independent', '독립'
        PARTIAL_ASSIST = 'partial_assist', '부분 보조'
        FULL_ASSIST = 'full_assist', '완전 보조'

    senior_id = models.BigAutoField(primary_key=True)
    login_id = models.CharField(max_length=150, unique=True)
    password_hash = models.CharField(max_length=128)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    diseases = models.TextField(blank=True)
    medication = models.TextField(blank=True)
    mobility_level = models.CharField(
        max_length=20, choices=MobilityLevel.choices,
    )
    barcode_code = models.CharField(max_length=100, unique=True)
    fruit_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Django AbstractBaseUser가 아니므로 DRF의 IsAuthenticated 등이 참조하는
    # is_authenticated/is_anonymous가 없다. AbstractBaseUser와 동일하게
    # 값이 아닌 상수로 정의한다 (인증된 요청에만 이 인스턴스가 붙으므로 항상 True).
    is_authenticated = True
    is_anonymous = False

    class Meta:
        db_table = 'senior'

    def __str__(self):
        return self.name

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)


class Guardian(models.Model):
    guardian_id = models.BigAutoField(primary_key=True)
    login_id = models.CharField(max_length=150, unique=True)
    password_hash = models.CharField(max_length=128)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Senior와 동일한 이유로 is_authenticated/is_anonymous를 상수로 정의한다.
    is_authenticated = True
    is_anonymous = False

    class Meta:
        db_table = 'guardian'

    def __str__(self):
        return self.name

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)


class GuardianSeniorMap(models.Model):
    class RegisteredVia(models.TextChoices):
        ID_SEARCH = 'id_search', '아이디 검색'
        BARCODE = 'barcode', '바코드 스캔'

    map_id = models.BigAutoField(primary_key=True)
    guardian = models.ForeignKey(
        Guardian, on_delete=models.CASCADE, db_column='guardian_id',
    )
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    registered_via = models.CharField(
        max_length=20, choices=RegisteredVia.choices,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'guardian_senior_map'
        unique_together = ('guardian', 'senior')

    def __str__(self):
        return f'{self.guardian_id} -> {self.senior_id}'


class Exercise(models.Model):
    class Difficulty(models.TextChoices):
        EASY = 'easy', '쉬움'
        MEDIUM = 'medium', '보통'
        HARD = 'hard', '어려움'

    exercise_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    difficulty = models.CharField(
        max_length=20, choices=Difficulty.choices,
    )
    guide_image_url = models.CharField(max_length=255)
    silhouette_url = models.CharField(max_length=255)
    reference_angles = models.JSONField()

    class Meta:
        db_table = 'exercise'

    def __str__(self):
        return self.name


class ExerciseMission(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', '대기'
        COMPLETED = 'completed', '완료'
        SKIPPED = 'skipped', '건너뜀'

    mission_id = models.BigAutoField(primary_key=True)
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, db_column='exercise_id',
    )
    scheduled_at = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )

    class Meta:
        db_table = 'exercise_mission'

    def __str__(self):
        return f'{self.senior_id} - {self.exercise_id} ({self.status})'


class ExerciseSession(models.Model):
    session_id = models.BigAutoField(primary_key=True)
    mission = models.ForeignKey(
        ExerciseMission, on_delete=models.CASCADE, db_column='mission_id',
    )
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    exercise = models.ForeignKey(
        Exercise, on_delete=models.CASCADE, db_column='exercise_id',
    )
    completion_rate = models.DecimalField(max_digits=5, decimal_places=2)
    accuracy_avg = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercise_session'

    def __str__(self):
        return f'{self.senior_id} - {self.exercise_id} @ {self.created_at}'


class PoseFeedback(models.Model):
    feedback_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        ExerciseSession, on_delete=models.CASCADE, db_column='session_id',
    )
    joint_name = models.CharField(max_length=100)
    deviation = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = 'pose_feedback'

    def __str__(self):
        return f'{self.session_id} - {self.joint_name}'


class PhysicalAbilityLog(models.Model):
    log_id = models.BigAutoField(primary_key=True)
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    rom_score = models.DecimalField(max_digits=5, decimal_places=2)
    completion_score = models.DecimalField(max_digits=5, decimal_places=2)
    logged_date = models.DateField()

    class Meta:
        db_table = 'physical_ability_log'
        unique_together = ('senior', 'logged_date')

    def __str__(self):
        return f'{self.senior_id} - {self.logged_date}'


class EmergencyEvent(models.Model):
    class EventType(models.TextChoices):
        FALL = 'fall', '낙상'
        INACTIVITY = 'inactivity', '무활동'
        SOS = 'sos', 'SOS'

    class Status(models.TextChoices):
        DETECTED = 'detected', '감지됨'
        FIRST_CHECK = 'first_check', '1차확인'
        FALSE_ALARM = 'false_alarm', '오보'
        NOTIFIED = 'notified', '긴급알림전송'
        RESOLVED = 'resolved', '종료'

    event_id = models.BigAutoField(primary_key=True)
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    detection_source = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DETECTED,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'emergency_event'

    def __str__(self):
        return f'{self.senior_id} - {self.event_type} ({self.status})'


class EmergencyNotification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    event = models.ForeignKey(
        EmergencyEvent, on_delete=models.CASCADE, db_column='event_id',
    )
    guardian = models.ForeignKey(
        Guardian, on_delete=models.CASCADE, db_column='guardian_id',
    )
    channel = models.CharField(max_length=50, default='fcm')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'emergency_notification'

    def __str__(self):
        return f'{self.event_id} -> {self.guardian_id} ({self.channel})'


class CameraAccessGrant(models.Model):
    grant_id = models.BigAutoField(primary_key=True)
    event = models.ForeignKey(
        EmergencyEvent, on_delete=models.CASCADE, db_column='event_id',
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'camera_access_grant'

    def __str__(self):
        return f'{self.event_id} ({self.granted_at} ~ {self.expires_at})'


class ActivityLog(models.Model):
    log_id = models.BigAutoField(primary_key=True)
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    activity_type = models.CharField(max_length=100)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_log'

    def __str__(self):
        return f'{self.senior_id} - {self.activity_type} @ {self.logged_at}'


class RankingSnapshot(models.Model):
    class RankScope(models.TextChoices):
        NATIONAL = 'national', '전국'
        REGIONAL = 'regional', '지역'

    snapshot_id = models.BigAutoField(primary_key=True)
    senior = models.ForeignKey(
        Senior, on_delete=models.CASCADE, db_column='senior_id',
    )
    score = models.IntegerField()
    snapshot_date = models.DateField()
    rank_scope = models.CharField(max_length=20, choices=RankScope.choices)
    rank_position = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'ranking_snapshot'
        unique_together = ('senior', 'snapshot_date', 'rank_scope')

    def __str__(self):
        return f'{self.senior_id} - {self.rank_scope} #{self.rank_position} ({self.snapshot_date})'
