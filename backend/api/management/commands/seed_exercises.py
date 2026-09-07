"""운동 콘텐츠 마스터 테이블(exercise)에 기본 4종을 채운다.

Exercise는 사용자가 만드는 데이터가 아니라 운영자가 미리 넣어두는 마스터
데이터인데, 등록용 API가 /admin/ 말고는 없어서 DB가 비어 있으면
GET /exercises/ 가 빈 배열을 돌려주고 시니어 운동 선택 화면이 통째로 빈다.
compose 볼륨을 지우면(docker compose down -v) 매번 다시 넣어야 하므로
수동 INSERT 대신 이 커맨드로 고정해 둔다.

값은 병합 전 frontend가 들고 있던 하드코딩 목록(MOCK_WORKOUTS)을 그대로
옮긴 것이다. category 문자열은 ExerciseSelectScreen의 CATEGORY_ICONS 키와
일치해야 카드에 이모지가 뜨고, pose_workout_key는 frontend의 포즈 파이프라인
(reference-poses.ts)이 참조하는 키라 임의로 바꾸면 운동이 매칭되지 않는다.

update_or_create라 여러 번 돌려도 중복 생성되지 않는다.
"""

from django.core.management.base import BaseCommand

from ...models import Exercise

# (name, category, difficulty, pose_workout_key)
DEFAULT_EXERCISES = [
    ('목/어깨 스트레칭', '스트레칭', 'easy', 'stretching'),
    ('앉아서 하는 팔 운동', '상체 운동', 'easy', 'upper_body'),
    ('무릎 당기기', '무릎 운동', 'medium', 'knee'),
    ('한 발로 균형잡기', '균형 운동', 'hard', 'balance'),
]


class Command(BaseCommand):
    help = '운동 콘텐츠 마스터 데이터(기본 4종)를 생성하거나 갱신한다.'

    def handle(self, *args, **options):
        created_count = 0

        for name, category, difficulty, pose_workout_key in DEFAULT_EXERCISES:
            _, created = Exercise.objects.update_or_create(
                name=name,
                defaults={
                    'category': category,
                    'difficulty': difficulty,
                    'pose_workout_key': pose_workout_key,
                    # 가이드 이미지 에셋이 아직 없다. 두 필드 모두 NOT NULL이라
                    # 비워둘 수 없어 빈 문자열로 채운다. 운동 진행 화면의 실루엣은
                    # 이 URL이 아니라 frontend의 로컬 에셋을 쓰므로 영향이 없다.
                    'guide_image_url': '',
                    'silhouette_url': '',
                    'reference_angles': {},
                },
            )
            created_count += created
            self.stdout.write(f'  {"생성" if created else "갱신"}  {name}')

        self.stdout.write(self.style.SUCCESS(
            f'운동 {len(DEFAULT_EXERCISES)}종 반영 완료 '
            f'(생성 {created_count} / 갱신 {len(DEFAULT_EXERCISES) - created_count})'
        ))
