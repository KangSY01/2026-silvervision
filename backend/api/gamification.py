"""게임화(fruit_count 보상, 순위 스냅샷) 로직.

RankingSnapshotSerializer 주석은 "score/rank_position 계산은 별도 배치
프로세스 책임"이라고 명시하지만, 이 저장소엔 스케줄러(Celery/cron)가 없다.
순위 산정 대상 시니어 수가 많지 않은 프로젝트 규모라, 세션이 완료될 때마다
그 날짜의 스냅샷을 그 자리에서 전량 재계산해 upsert하는 방식으로 "배치"를
대신한다. 대량 백필이나 수동 재계산이 필요하면 recalculate_rankings()를
`python manage.py recalculate_rankings`로 직접 돌릴 수 있다.

AGENTS.md 3장의 'AI 모델 경계'와는 무관하다 - score는 "이번 달 완료된
세션 수"라는 단순 집계일 뿐 자세 추정/판정 로직이 아니다. 백엔드가
"이미 계산된 결과값만 저장·조회한다"는 원칙은 그대로 지켜지며, 여기서
계산하는 건 세션 row 개수라는 명백한 집계값이다.
"""

import datetime as dt

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from .models import ExerciseSession, RankingSnapshot, Senior

# 세션 1회 완료(completion_rate 기록)당 열매 1개. 프론트 목업의 "6개 중
# N개 획득" 표현에 맞춰 하루 최대 6개로 상한을 둔다 - 하루에 여러 번
# 몰아서 운동해도 보상이 무한정 쌓이지 않도록.
FRUIT_PER_SESSION = 1
FRUIT_DAILY_CAP = 6


def _completed_sessions(qs):
    """completion_rate가 채워진 세션 = "완료 처리된" 세션.

    accuracy_avg만 있고 completion_rate가 없는 경우는 달성률 미측정이라
    완료로 보지 않는다 (fruit/score 양쪽에서 동일한 기준을 쓴다).
    """
    return qs.filter(completion_rate__isnull=False)


def _local_date(value):
    return timezone.localtime(value).date() if timezone.is_aware(value) else value.date()


def region_key(address):
    """자유 텍스트 주소에서 '시/도 + 구/군' 수준의 접두어를 뽑아 지역 그룹 키로 쓴다.

    regional 순위는 이 키가 같은 시니어끼리 묶는다. 상세주소(도로명·번지·동)까지
    포함한 전체 문자열로 비교하면 같은 동네 시니어도 상세주소가 조금만 달라도
    다른 그룹이 되므로, 앞쪽 행정구역 단위만 남긴다.

        "서울특별시 강남구 테헤란로 123"  -> "서울특별시 강남구"
        "경기도 성남시 분당구 정자동 …"    -> "경기도 성남시 분당구"
        "부산광역시 해운대구"              -> "부산광역시 해운대구"
        "경기도 가평군 …"                 -> "경기도 가평군"
        "제주특별자치도 서귀포시 …"        -> "제주특별자치도 서귀포시"
        "세종특별자치시 한누리대로 …"      -> "세종특별자치시"

    한계: address가 자유 입력 필드라 파싱이 완벽하지 않다. 표기가 흔들리면
    (`서울시`/`서울특별시`/`서울`), 시·도를 생략하고 `강남구 역삼동 …`처럼 쓰거나,
    상세주소를 앞에 두거나, 오타·영문 주소인 경우 잘못 묶이거나 각자 단독 그룹이
    된다. 정확한 지역 그룹핑이 필요하면 스키마에 행정구역 코드(법정동코드) 컬럼을
    두고 프론트에서 선택형으로 입력받아야 하는데, 현재 `senior` 테이블엔 없다.
    """
    tokens = (address or '').split()
    if not tokens:
        return ''

    picked = [tokens[0]]
    for token in tokens[1:]:
        if token.endswith(('구', '군')):
            # 구/군 단위까지 포함하고 종료
            picked.append(token)
            break
        if token.endswith('시') and picked[-1].endswith('도'):
            # 도 아래의 시(예: "경기도 성남시")는 이어서 구를 계속 찾는다
            picked.append(token)
            continue
        # 도로명·번지 등 그 밖의 토큰을 만나면 여기서 멈춘다
        break
    return ' '.join(picked)


def recompute_fruit_count(senior):
    """senior.fruit_count를 완료 세션 기록으로부터 결정적으로 다시 계산한다.

    단순 +1 증가가 아니라 전량 재계산이라 같은 세션이 두 번 PATCH돼도
    이중 지급되지 않는다(멱등). 하루 완료 수는 FRUIT_DAILY_CAP으로 자른다.
    날짜 그룹핑은 MySQL 타임존 테이블 의존을 피하려 파이썬에서 처리한다
    (시니어당 세션 수가 적어 부담 없음).
    """
    created_ats = _completed_sessions(
        ExerciseSession.objects.filter(senior=senior)
    ).values_list('created_at', flat=True)

    per_day = {}
    for value in created_ats:
        day = _local_date(value)
        per_day[day] = per_day.get(day, 0) + 1

    total = sum(
        min(count * FRUIT_PER_SESSION, FRUIT_DAILY_CAP)
        for count in per_day.values()
    )
    if senior.fruit_count != total:
        senior.fruit_count = total
        senior.save(update_fields=['fruit_count', 'updated_at'])
    return total


def _assign_positions(rows):
    """점수 내림차순으로 정렬된 [(senior_id, score), ...] → {senior_id: 순위}.

    동점은 같은 순위를 갖는 표준 경쟁 순위(1, 2, 2, 4 …)로 매긴다.
    """
    positions = {}
    prev_score = object()
    prev_position = 0
    for index, (senior_id, score) in enumerate(rows, start=1):
        if score != prev_score:
            prev_position = index
            prev_score = score
        positions[senior_id] = prev_position
    return positions


@transaction.atomic
def recalculate_rankings(snapshot_date=None):
    """주어진 날짜(기본: 오늘)의 national/regional RankingSnapshot을 전량 재계산.

    - score       = 그 달 1일 00:00부터 snapshot_date 24:00까지 완료된 세션 수
    - 순위 풀      = 해당 기간에 완료 세션이 1건 이상인 시니어
    - national    = 풀 전체를 score 내림차순으로
    - regional    = region_key(senior.address)(시/도+구/군 접두어)가 같은 시니어끼리
                    묶어 각 그룹 내 score 내림차순 (DB_SCHEMA.md의 ranking_snapshot 설명)

    unique_together(senior, snapshot_date, rank_scope) 위에서 update_or_create로
    upsert하므로 같은 날 여러 번 호출해도 최신 집계로 덮어써진다.
    """
    snapshot_date = snapshot_date or timezone.localdate()
    month_start = timezone.make_aware(
        dt.datetime.combine(snapshot_date.replace(day=1), dt.time.min)
    )
    period_end = timezone.make_aware(
        dt.datetime.combine(snapshot_date + dt.timedelta(days=1), dt.time.min)
    )

    counts = (
        _completed_sessions(
            ExerciseSession.objects.filter(
                created_at__gte=month_start, created_at__lt=period_end,
            )
        )
        .values('senior_id')
        .annotate(n=Count('session_id'))
    )
    score_by_senior = {row['senior_id']: row['n'] for row in counts}
    if not score_by_senior:
        return

    seniors = list(
        Senior.objects.filter(senior_id__in=score_by_senior.keys())
        .values('senior_id', 'address')
    )

    national_rows = sorted(
        ((s['senior_id'], score_by_senior[s['senior_id']]) for s in seniors),
        key=lambda pair: -pair[1],
    )
    national_positions = _assign_positions(national_rows)

    by_region = {}
    for senior in seniors:
        by_region.setdefault(
            region_key(senior['address']), []
        ).append(senior['senior_id'])
    regional_positions = {}
    for senior_ids in by_region.values():
        rows = sorted(
            ((sid, score_by_senior[sid]) for sid in senior_ids),
            key=lambda pair: -pair[1],
        )
        regional_positions.update(_assign_positions(rows))

    Scope = RankingSnapshot.RankScope
    for senior_id, score in score_by_senior.items():
        RankingSnapshot.objects.update_or_create(
            senior_id=senior_id, snapshot_date=snapshot_date,
            rank_scope=Scope.NATIONAL,
            defaults={'score': score, 'rank_position': national_positions[senior_id]},
        )
        RankingSnapshot.objects.update_or_create(
            senior_id=senior_id, snapshot_date=snapshot_date,
            rank_scope=Scope.REGIONAL,
            defaults={'score': score, 'rank_position': regional_positions[senior_id]},
        )


def latest_ranking(senior):
    """시니어의 scope별 최신 스냅샷을 {'national': obj|None, 'regional': obj|None}로 반환."""
    result = {}
    for scope in (
        RankingSnapshot.RankScope.NATIONAL,
        RankingSnapshot.RankScope.REGIONAL,
    ):
        result[scope] = (
            RankingSnapshot.objects
            .filter(senior=senior, rank_scope=scope)
            .order_by('-snapshot_date')
            .first()
        )
    return result
