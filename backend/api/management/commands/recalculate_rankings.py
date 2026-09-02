"""오늘 날짜의 national/regional RankingSnapshot을 전량 재계산한다.

세션 완료 시점(ExerciseSessionDetailView PATCH)에도 자동으로 재계산되지만,
초기 데이터 백필이나 세션 없이 지나간 날의 스냅샷을 채우고 싶을 때 수동으로
돌리기 위한 진입점이다 - 정식 스케줄러(Celery/cron) 대용.
"""

from django.core.management.base import BaseCommand

from ...gamification import recalculate_rankings


class Command(BaseCommand):
    help = '오늘 날짜의 전국/지역 순위 스냅샷을 전량 재계산한다.'

    def handle(self, *args, **options):
        recalculate_rankings()
        self.stdout.write(self.style.SUCCESS('순위 스냅샷 재계산 완료'))
