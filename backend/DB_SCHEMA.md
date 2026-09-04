# DB_SCHEMA.md

실버비전 백엔드 데이터베이스 스키마 문서 (v2)

착수보고서 4.1절(기능 명세서), 중간보고서 2.4절(데이터베이스 설계)·2.5절(ERD)을 기준으로 작성했다. 착수보고서 대비 변경 이력(v1→v2)은 각 테이블 하단에 표시했다.

## 변경 이력 요약 (착수 → 중간)

- `health_survey` 테이블 삭제 (맞춤형 운동 추천 기능 제거에 따름)
- `exercise.guide_video_url` → `exercise.guide_image_url`로 변경 (시범 영상 → 정지 이미지·실루엣 방식)
- `exercise.silhouette_url` 신규 추가
- `exercise.reference_angles` (JSON) 신규 추가 — 관절 각도 기반 피드백의 기준값
- 노년 특화 경량 분류기는 낙상·무활동 감지 전담으로 범위 축소 (운동 동작 피드백은 관절 각도 계산 방식으로 대체) → DB 구조 자체에는 영향 없으나 `pose_feedback` 테이블의 성격이 "관절 각도 편차 저장용"으로 확정됨

## 전체 테이블 목록 (13개)

| 영역 | 테이블명 | 설명 |
|---|---|---|
| 계정 | `senior` | 시니어(피보호자) 계정 |
| 계정 | `guardian` | 보호자 계정 |
| 계정 | `guardian_senior_map` | 보호자-시니어 N:M 매핑 |
| 운동 | `exercise` | 운동 콘텐츠 마스터 |
| 운동 | `exercise_mission` | 운동 미션 및 알림 스케줄 |
| 기록 | `exercise_session` | 운동 세션 (달성률·일치도·FPS) |
| 기록 | `pose_feedback` | 관절 각도 기반 피드백 상세 |
| 기록 | `physical_ability_log` | 장기 신체 능력 추적 (일별 집계) |
| 응급 | `emergency_event` | 낙상·무활동·SOS 이벤트 |
| 응급 | `emergency_notification` | FCM 알림 발송 이력·지연 시간 |
| 응급 | `camera_access_grant` | 응급 시 제한적 카메라 접근 권한 |
| 응급 | `activity_log` | 무활동 감지용 기기 활동 로그 |
| 게임화 | `ranking_snapshot` | 전국·지역 순위 일별 스냅샷 |

---

## 1. 계정

### `senior` — 시니어(피보호자) 계정

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `senior_id` | BIGINT, PK | |
| `login_id` | VARCHAR, UNIQUE | |
| `password_hash` | VARCHAR | Django `make_password` 등으로 해싱 저장 |
| `name` | VARCHAR | 성함 |
| `phone` | VARCHAR | 연락처 |
| `address` | VARCHAR | 주소 |
| `diseases` | TEXT | 질환 (착수보고서 4.1절 회원가입 필드) |
| `medication` | TEXT | 복용약 |
| `mobility_level` | VARCHAR (ENUM 대응) | `independent`(독립) / `partial_assist`(부분 보조) / `full_assist`(완전 보조) |
| `barcode_code` | VARCHAR, UNIQUE | 보호자 연동용 개인 바코드 |
| `fruit_count` | INT, DEFAULT 0 | 나무 열매 획득 개수 (게임화) |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `guardian` — 보호자 계정

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `guardian_id` | BIGINT, PK | |
| `login_id` | VARCHAR, UNIQUE | |
| `password_hash` | VARCHAR | |
| `name` | VARCHAR | 성함 |
| `phone` | VARCHAR | 연락처 |
| `address` | VARCHAR | 주소 |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `guardian_senior_map` — 보호자-시니어 매핑 (N:M)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `map_id` | BIGINT, PK | |
| `guardian_id` | BIGINT, FK → `guardian.guardian_id` | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `registered_via` | VARCHAR (ENUM 대응) | `id_search`(아이디 검색) / `barcode`(바코드 스캔) |
| `created_at` | DATETIME | |

- `(guardian_id, senior_id)` UNIQUE 제약 (중복 등록 방지)

---

## 2. 운동

### `exercise` — 운동 콘텐츠 마스터

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `exercise_id` | BIGINT, PK | |
| `name` | VARCHAR | 운동명 (예: 스트레칭, 상체 운동, 무릎 운동, 균형 운동) |
| `category` | VARCHAR | 분류 |
| `difficulty` | INT 또는 VARCHAR | 난이도 (쉬움/보통) |
| `guide_image_url` | VARCHAR | 운동 안내 이미지 (v1의 `guide_video_url`에서 변경) |
| `silhouette_url` | VARCHAR | 따라하기용 실루엣 이미지 (신규) |
| `reference_angles` | JSON | 기준 관절 각도 (신규, 관절 각도 편차 계산의 기준값) |

**변경**: v1 `guide_video_url` → v2 `guide_image_url`로 컬럼명·용도 변경. `silhouette_url`, `reference_angles` v2 신규 추가.

### `exercise_mission` — 운동 미션 및 알림 스케줄

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `mission_id` | BIGINT, PK | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `exercise_id` | BIGINT, FK → `exercise.exercise_id` | |
| `scheduled_at` | DATETIME | 알림 예정 시각 |
| `status` | VARCHAR | 미션 상태 (예: pending/completed/skipped) |

---

## 3. 기록

### `exercise_session` — 운동 세션

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_id` | BIGINT, PK | |
| `mission_id` | BIGINT, FK → `exercise_mission.mission_id` | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `exercise_id` | BIGINT, FK → `exercise.exercise_id` | |
| `completion_rate` | DECIMAL, NULL 허용 | 달성률 (세션 시작 시점엔 NULL, 종료 시 채워짐) |
| `accuracy_avg` | DECIMAL, NULL 허용 | 동작 일치도 평균 (세션 시작 시점엔 NULL, 종료 시 채워짐) |

**변경 (v2.2, 2026-07-17)**: `POST /senior/{id}/sessions/`(세션 시작)에서 아직 계산되지 않은 값을 요구하지 않도록 `completion_rate`/`accuracy_avg`를 nullable로 변경. 0.00 기본값 대신 NULL을 택한 이유는 `ranking_snapshot.rank_position`과 동일(미측정과 실제 0점을 구분하기 위함).

### `pose_feedback` — 관절 각도 기반 피드백 상세

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `feedback_id` | BIGINT, PK | |
| `session_id` | BIGINT, FK → `exercise_session.session_id` | |
| `joint_name` | VARCHAR | 관절 부위명 |
| `deviation` | DECIMAL | 기준 각도 대비 편차 |

**용도 확정 (중간보고서 1.1절 (3))**: 운동 피드백은 학습 기반 분류기가 아니라 `exercise.reference_angles`와의 편차 계산 방식으로 처리하며, 이 테이블은 그 계산 결과를 저장한다.

### `physical_ability_log` — 장기 신체 능력 추적 (일별 집계)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `log_id` | BIGINT, PK | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `rom_score` | DECIMAL | 관절 가동 범위(Range of Motion) 점수 |
| `completion_score` | DECIMAL | 동작 완성도 점수 |

---

## 4. 응급

### `emergency_event` — 낙상·무활동·SOS 이벤트

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `event_id` | BIGINT, PK | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `event_type` | VARCHAR | `fall`(낙상) / `inactivity`(무활동) / `sos`(음성 구조 키워드) |
| `detection_source` | VARCHAR | 감지 경로 (비전 모델, 센서, 음성 등) |
| `status` | VARCHAR | 처리 상태 (감지됨/1차확인/오보/긴급알림전송/종료) |

### `emergency_notification` — FCM 알림 발송 이력

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `notification_id` | BIGINT, PK | |
| `event_id` | BIGINT, FK → `emergency_event.event_id` | |
| `guardian_id` | BIGINT, FK → `guardian.guardian_id` | |
| `channel` | VARCHAR | 알림 채널 (FCM 등) |

- 발송 지연 시간 등 성능 지표는 이 테이블에 타임스탬프 컬럼(`sent_at` 등)을 추가해 계산 (착수보고서 3.2절 "효율성" 요구사항 대응, 구체 기준은 성능 테스트 후 확정 예정이라 v2 시점엔 미확정)

### `camera_access_grant` — 응급 시 제한적 카메라 접근 권한

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `grant_id` | BIGINT, PK | |
| `event_id` | BIGINT, FK → `emergency_event.event_id` | |
| `granted_at` | DATETIME | 권한 부여 시각 |
| `expires_at` | DATETIME | 만료 시각 (응급 상황으로 판별된 제한적 시간 동안만 유효) |

### `activity_log` — 무활동 감지용 기기 활동 로그

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `log_id` | BIGINT, PK | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `activity_type` | VARCHAR | 화면 On/Off, 터치 이벤트, 가속도 센서 등 |
| `logged_at` | DATETIME | |

---

## 5. 게임화

### `ranking_snapshot` — 전국·지역 순위 일별 스냅샷

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `snapshot_id` | BIGINT, PK | |
| `senior_id` | BIGINT, FK → `senior.senior_id` | |
| `score` | INT | 순위 산정용 점수 |
| `snapshot_date` | DATE | 스냅샷 산출 일자 |
| `rank_scope` | VARCHAR (ENUM 대응) | `national`(전국) / `regional`(지역) |
| `rank_position` | INT | 해당 scope 내 순위 (예: 전국 247위) |

- `(senior_id, snapshot_date, rank_scope)` UNIQUE 제약 (같은 시니어가 같은 날 같은 scope로 중복 스냅샷을 갖지 않도록)
- 전국 순위/지역 순위는 이 스냅샷 테이블을 기준으로 별도 배치·쿼리에서 산출 (지역 정보는 `senior.address` 참고). `score`/`rank_position` 계산 자체는 백엔드가 아닌 배치 프로세스의 책임이며, API는 이미 계산된 스냅샷 값을 조회용으로 노출한다.

**변경 (v2.1, 2026-07-17)**: 착수 시점 스키마에는 `score`만 있었으나, `/senior/{id}/ranking/` 조회 API 설계 과정에서 순위 표시(예: "전국 247위")에 필요한 `snapshot_date`/`rank_scope`/`rank_position`이 누락되어 있음을 확인해 추가.

---

## 참고 — API 연동 관련 메모

중간보고서 5.2절 기준으로, 아래 엔드포인트가 이 스키마와 직접 연결된다. (2026-09-02 기준 실제 `api/urls.py` 라우팅과 대조해 갱신)

**구현 완료**
- `/auth/senior/register/`, `/auth/senior/login/` → `senior`
- `/auth/guardian/register/`, `/auth/guardian/login/` → `guardian`
- **회원가입 비밀번호 규칙이 역할별로 다름** (2026-09-04): 시니어는 **정확히 4자리 숫자 PIN**(접근성 — 로그인 화면이 "숫자 4자리" UX로 고정), 보호자는 **8자 이상 영문+숫자 조합**(일반 성인 UX). 등록 시리얼라이저(`SeniorRegisterSerializer`/`GuardianRegisterSerializer`)에서만 검증하고, `password_hash`는 Django hasher로 저장, 로그인은 `check_password` 해시 비교라 규칙과 무관. 상세 근거는 AGENTS.md "인증/권한".
- `POST /auth/token/refresh/` (access token 재발급), `POST /auth/logout/` (refresh token 무효화) — (2026-09-02 구현). 이 스키마의 13개 테이블과 무관하며, 로그아웃 blacklist용으로 `rest_framework_simplejwt.token_blacklist` 앱이 자체 테이블 2개(`token_blacklist_outstandingtoken`, `token_blacklist_blacklistedtoken`)를 추가한다(라이브러리 관리, `migrate`만 필요). 상세 근거는 AGENTS.md 5장 "인증/권한".
- `/senior/{id}/`, `/guardian/{id}/` (조회/수정) → `senior`, `guardian`
  - **`GET /senior/{id}/` 권한 (2026-09-04 확장)**: `IsSeniorSelfOrMappedGuardian` — 시니어 본인 또는 `guardian_senior_map`으로 연결된 보호자. 보호자 피보호자 상세 화면(`SeniorDetailScreen`)이 질환·주소·복용약을 표시하도록 설계돼 있어 `SeniorProfileSerializer` 전체를 그대로 내려준다(`password_hash`는 시리얼라이저 `fields`에 없어 미노출). `PUT/PATCH`(프로필 수정)는 `IsSeniorSelf` 유지 — 보호자는 수정 불가. 매핑 안 된 보호자·타 시니어는 403(세션·활동로그 엔드포인트와 동일 기준).
- `/guardian/{id}/seniors/` (GET 목록 / POST 등록), `.../seniors/{senior_id}/` (DELETE 해제) → `guardian_senior_map`
  - (2026-09-02 구현) POST body는 `registered_via` + (`login_id` | `barcode_code`)이며, 두 값 모두 `senior` 테이블에 UNIQUE라 **서버가 senior를 조회**한다 (클라이언트가 senior_id를 직접 보내지 않음 → `registered_via`가 실제 조회 경로를 정확히 반영). `(guardian, senior)` UNIQUE 위반(중복 등록)은 **409**, 존재하지 않는 식별자는 **404**. 승인 절차는 스키마·화면에 없어 등록 즉시 연결된다.
- `/senior/{id}/missions/`, `.../missions/{mission_id}/` → `exercise_mission`
- `/senior/{id}/sessions/`, `.../sessions/{session_id}/`, `.../feedback/` → `exercise_session`, `pose_feedback`
  - (2026-09-02 추가) 세션 `GET` 목록/상세 구현. 상세 응답은 연결된 `pose_feedback`을 `pose_feedbacks`로 nested 포함(목록에는 미포함 — 세션 밖에서 `pose_feedback`을 조회할 경로가 없어 상세에 인라인).
  - **권한 (2026-09-04 확장)**: `GET` 목록/상세는 `IsSeniorSelfOrMappedGuardian` — 시니어 본인 또는 `guardian_senior_map`으로 그 시니어와 연결된 보호자가 조회할 수 있다(보호자 앱에서 피보호자 운동 이력을 봐야 함). 쓰기는 그대로 시니어 본인만: `POST`(세션 시작)·`PATCH`(`completion_rate`/`accuracy_avg`)·`.../feedback/` 모두 `IsSeniorSelf`. 매핑 안 된 보호자·타 시니어는 **403**(스코프 접근 권한은 permission 계층이 판단), 스코프 안에서 다른 시니어 소속 `session_id`는 `get_queryset()`이 **404**. 응급 이벤트 배치는 URL에 `senior_id`가 없어 전부 404로 통일했지만, 여기는 URL `senior_id`로 스코프를 대조할 수 있어 403/404를 계층별로 나눈다.
- `/emergency/`, `/emergency/{event_id}/`, `.../notify/`, `.../camera-grant/` (POST/DELETE) → `emergency_event`, `emergency_notification`, `camera_access_grant`
  - (2026-09-02 추가) 이벤트 `GET` 목록/상세 구현. 목록/상세 모두 `_visible_emergency_events`(시니어 본인 소유 또는 `guardian_senior_map`으로 연결된 보호자에게 보이는 것)로 필터 — 다른 시니어 소속 `event_id` 접근 시 404. 상세 응답은 `emergency_notification`(`notifications`), `camera_access_grant`(`camera_grants`)를 nested 포함(둘 다 독립 조회 엔드포인트 없음). 생성은 시니어 본인만, 목록/상세는 시니어·보호자 모두.
- `/exercises/`, `/exercises/{id}/` → `exercise` (2026-07-24: 문서에는 "구현 완료"로 표기돼 있었으나 실제 `views.py`/`urls.py`에는 라우팅·뷰가 없던 상태였고, 이번에 실제로 구현해 문서와 코드를 일치시킴)
- `GET /senior/{id}/ranking/` → `ranking_snapshot` (2026-09-02 구현). 권한 `IsSeniorSelf`. 응답은 `{"national": <스냅샷>|null, "regional": <스냅샷>|null}` — scope별 최신(`snapshot_date` 기준) 스냅샷을 나란히 담는다. 완료 세션이 없는 신규 시니어는 두 scope 모두 `null` + `200`("순위 없음"은 정상 상태라 404가 아님).
  - **순위 산정 방식** (배치 프로세스 부재에 대한 결정): 정식 스케줄러(Celery/cron) 대신, `POST/PATCH`로 세션이 완료 처리(`exercise_session.completion_rate`가 채워짐)될 때 `api/gamification.py`의 `recalculate_rankings()`가 **그 날짜의 national/regional 스냅샷을 전량 재계산해 upsert**한다. `score` = "그 달 1일부터 오늘까지 완료된 세션 수"(AI 경계와 무관한 단순 row 집계). `rank_position` = 같은 `snapshot_date`·`rank_scope` 내 `score` 내림차순 표준 경쟁 순위(동점 동순위: 1,2,2,4). `regional`은 `senior.address` 전체 문자열이 아니라 거기서 뽑은 **"시/도 + 구/군" 접두어**(`api/gamification.py`의 `region_key()`, 예: `"서울특별시 강남구 테헤란로 123"` → `"서울특별시 강남구"`)가 같은 시니어끼리 묶는다. 순위 풀은 해당 월에 완료 세션이 1건 이상인 시니어. `address`가 자유 입력 필드라 접두어 파싱이 완벽하지 않다 — 표기 흔들림(`서울시`/`서울특별시`), 시·도 생략, 상세주소를 앞에 쓴 경우, 오타·영문 주소는 잘못 묶이거나 단독 그룹이 된다. 정확한 그룹핑이 필요하면 행정구역 코드 컬럼을 추가해야 한다. 순위 대상 시니어 수가 적은 프로젝트 규모라 매 완료마다 전량 재계산해도 부담이 없다고 판단했고, 커지면 `python manage.py recalculate_rankings`(신규 management command)로 배치 전환 가능하다.
- `Senior.fruit_count` 증감(운동 보상) — `exercise_session` 완료(`completion_rate` 기록) 시 `api/gamification.py`의 `recompute_fruit_count()`가 트리거된다. 세션 1회 완료당 열매 1개(`FRUIT_PER_SESSION`), **하루 최대 6개**(`FRUIT_DAILY_CAP`, 프론트 "6개 중 N개 획득" 표현에 맞춤). 단순 +1이 아니라 완료 세션 기록으로부터 `fruit_count`를 전량 재계산(일자별 `min(완료 수, 6)`의 합)하므로 같은 세션을 다시 PATCH해도 이중 지급되지 않는다.
- `GET·POST /senior/{id}/activity-log/` → `activity_log` (2026-09-02 구현). `senior`는 URL에서 강제 주입(read-only), `logged_at`은 `auto_now_add`.
  - **권한 (2026-09-04 확장)**: `GET`은 `IsSeniorSelfOrMappedGuardian`(시니어 본인 또는 매핑된 보호자 — 보호자 앱 무활동 모니터링). `POST`는 로그를 만들어 보내는 주체가 시니어 기기뿐이라 `IsSeniorSelf` 유지. 매핑 안 된 보호자·타 시니어 접근 시 **403**(세션 엔드포인트와 동일 기준).
  - **`activity_type`은 choices로 잠그지 않고 `CharField` 자유 문자열 유지**. 이벤트 종류(screen_on/off, touch, accelerometer, …)는 기기/AI 파트가 정하고 센서 추가에 따라 늘 수 있어(AI 모델 경계), 백엔드 enum으로 고정하면 값이 늘 때마다 마이그레이션·배포가 필요해진다. 빈 문자열만 거부.
  - **POST는 단건(JSON object)·여러 건(JSON array) 모두 수용** — 기기가 활동 이벤트를 짧은 주기로 모아 보내는 센서 로그 특성상 `pose_feedback`과 같은 `bulk_create` 패턴을 재사용. `bulk_create`라 MySQL에서는 응답의 `log_id`가 비어 있을 수 있다(fire-and-forget 용도라 무방).
  - **GET은 최신순, 기본 100건·최대 500건으로 제한.** 무활동 판정은 "최근 일정 시간 안에 로그가 있는지"만 보므로 전체 이력이 불필요하고, 무한 반환하면 응답이 비대해진다. `?limit=<n>`(건수), `?since=<ISO8601>`(그 시각 이후)로 조절.
- `GET·POST /senior/{id}/ability-log/` → `physical_ability_log` (2026-09-02 구현). 권한 `IsSeniorSelf`. `senior`는 URL에서 강제 주입(read-only).
  - **POST는 `(senior, logged_date)` unique 충돌 시 409가 아니라 `update_or_create` upsert** — 새 날짜면 201, 기존 날짜 갱신이면 200. `rom_score`/`completion_score`는 그날 여러 세션을 거치며 마지막 측정값으로 갱신될 수 있는 값이라 재요청을 막는 것보다 덮어쓰는 게 자연스럽다. `logged_date` 생략 시 오늘. 음수 점수는 400(상한은 척도 미확정이라 미설정, `DecimalField`가 999.99까지만 허용).
  - **GET은 필터 없이 전체 반환, `logged_date` 오름차순.** 하루 최대 1건이라 1년치도 365건뿐이라 activity-log 같은 기간/건수 필터가 불필요하고, 주/월 단위 추이 그래프가 시간 오름차순으로 그려지므로 정렬도 오름차순으로 맞췄다.

**구현 예정**
- (스키마 직결 엔드포인트는 없음 — 비밀번호 변경/재설정, 매핑 등록 전 시니어 검색 API만 남음. AGENTS.md 5장 "미구현" 표 참고)

이번 재개발은 이 문서(v2 스키마)를 기준으로 처음부터 다시 구현하며, 위 API 목록은 우선순위 참고용이지 기존 코드가 남아있다는 의미는 아니다 (완전히 새로 작성).