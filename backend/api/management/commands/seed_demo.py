"""개발·시연용 데이터를 한 번에 채운다.

`docker compose down -v`로 볼륨을 지우면 계정·연동·운동·알림이 전부 사라지는데,
계정 생성은 API 호출로만 가능해 매번 회원가입을 다시 하거나 curl을 기억해
쳐야 했다. 이 커맨드 하나로 데모 환경을 통째로 복구한다.

생성 대상:
  1. 시니어  silver99  / 1234          (LoginScreen 기본 입력값과 일치)
  2. 보호자  guardian1 / guardian1234  (GuardianLoginScreen 기본 입력값과 일치)
  3. 둘의 연동(GuardianSeniorMap)
  4. 운동 4종 (seed_exercises 재사용)
  5. 응급 알림 4건 - --with-alerts 를 준 경우에만

전부 update_or_create/get_or_create 기반이라 여러 번 돌려도 중복되지 않는다.
비밀번호는 이미 있는 계정이면 덮어쓰지 않는다(직접 바꿔둔 값을 되돌리지 않기
위해서다 - 초기화가 필요하면 --reset-password).

비밀번호 규칙(시니어 숫자 4자리 / 보호자 8자 이상 영문+숫자)은 등록
시리얼라이저를 그대로 태워 검증한다. 모델에 직접 INSERT하면 평문이 저장돼
로그인이 안 되므로 set_password를 거치는 이 경로를 유지할 것.
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ...models import EmergencyEvent, Guardian, GuardianSeniorMap, Senior
from ...serializers import GuardianRegisterSerializer, SeniorRegisterSerializer

SENIOR = {
    'login_id': 'silver99',
    'password': '1234',
    'name': '김철수',
    'phone': '01055558888',
    'address': '서울특별시 종로구 건강길 100',
    'diseases': '초기 퇴행성 관절염',
    'medication': '혈압약 아침 1정',
    'mobility_level': 'independent',
}

GUARDIAN = {
    'login_id': 'guardian1',
    'password': 'guardian1234',
    'name': '박보호',
    'phone': '01099991234',
    'address': '서울특별시 마포구 독막로 45',
}

# (몇 시간 전, event_type, detection_source, status)
# 최근 2건이 보호자 홈 피드에 뜬다. 하나는 미종결(주황)·하나는 종결(초록)로
# 잡아 두 표시를 모두 확인할 수 있게 한다.
ALERTS = [
    (2, 'fall', 'exercise:balance', 'notified'),
    (26, 'inactivity', 'daily_activity_scan', 'resolved'),
    (50, 'sos', 'sos_button', 'false_alarm'),
    (74, 'fall', 'exercise:knee', 'resolved'),
]


class Command(BaseCommand):
    help = '개발·시연용 계정/연동/운동(/알림)을 생성한다. DEBUG=True 에서만 동작한다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--with-alerts', action='store_true',
            help='응급 알림 4건도 함께 생성한다(기본은 생성하지 않음).',
        )
        parser.add_argument(
            '--reset-password', action='store_true',
            help='이미 있는 계정의 비밀번호를 위 기본값으로 되돌린다.',
        )

    def handle(self, *args, **options):
        # 운영 DB에서 실수로 도는 것을 막는다. 알려진 아이디·비밀번호 계정을
        # 만드는 커맨드라 실환경에 들어가면 그대로 침입 경로가 된다.
        if not settings.DEBUG:
            raise CommandError('DEBUG=False 에서는 실행할 수 없습니다(개발 전용).')

        senior = self._upsert(
            Senior, SeniorRegisterSerializer, SENIOR, options['reset_password'],
        )
        guardian = self._upsert(
            Guardian, GuardianRegisterSerializer, GUARDIAN, options['reset_password'],
        )

        _, created = GuardianSeniorMap.objects.get_or_create(
            guardian=guardian, senior=senior,
            defaults={'registered_via': GuardianSeniorMap.RegisteredVia.ID_SEARCH},
        )
        self.stdout.write(f'  {"생성" if created else "유지"}  연동  {guardian.name} → {senior.name}')

        self.call_command_seed_exercises()

        if options['with_alerts']:
            self._seed_alerts(senior)

        self.stdout.write(self.style.SUCCESS(
            f'\n데모 데이터 준비 완료\n'
            f'  시니어  {SENIOR["login_id"]} / {SENIOR["password"]}\n'
            f'  보호자  {GUARDIAN["login_id"]} / {GUARDIAN["password"]}'
        ))

    def _upsert(self, model, serializer_class, data, reset_password):
        """있으면 두고 없으면 등록 시리얼라이저로 만든다."""
        existing = model.objects.filter(login_id=data['login_id']).first()
        if existing is not None:
            if reset_password:
                existing.set_password(data['password'])
                existing.save(update_fields=['password'])
                self.stdout.write(f'  갱신  {model.__name__}  {data["login_id"]} (비밀번호 초기화)')
            else:
                self.stdout.write(f'  유지  {model.__name__}  {data["login_id"]}')
            return existing

        serializer = serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        self.stdout.write(f'  생성  {model.__name__}  {data["login_id"]}')
        return obj

    def call_command_seed_exercises(self):
        from django.core.management import call_command
        call_command('seed_exercises')

    def _seed_alerts(self, senior):
        EmergencyEvent.objects.filter(senior=senior).delete()
        now = timezone.now()
        for hours_ago, event_type, source, status in ALERTS:
            event = EmergencyEvent.objects.create(
                senior=senior, event_type=event_type,
                detection_source=source, status=status,
            )
            # created_at은 auto_now_add라 create()로 지정할 수 없다. 피드 정렬과
            # 시각 표시를 확인하려면 간격이 있어야 해서 뒤에서 덮어쓴다.
            EmergencyEvent.objects.filter(pk=event.pk).update(
                created_at=now - timedelta(hours=hours_ago),
            )
        self.stdout.write(f'  생성  알림 {len(ALERTS)}건')
