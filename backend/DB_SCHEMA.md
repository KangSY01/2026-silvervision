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
| `completion_rate` | DECIMAL | 달성률 |
| `accuracy_avg` | DECIMAL | 동작 일치도 평균 |

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
| `rank_scope` | VARCHAR (ENUM 대응) | `national`(전국) / `region`(지역) |
| `rank_position` | INT | 해당 scope 내 순위 (예: 전국 247위) |

- `(senior_id, snapshot_date, rank_scope)` UNIQUE 제약 (같은 시니어가 같은 날 같은 scope로 중복 스냅샷을 갖지 않도록)
- 전국 순위/지역 순위는 이 스냅샷 테이블을 기준으로 별도 배치·쿼리에서 산출 (지역 정보는 `senior.address` 참고). `score`/`rank_position` 계산 자체는 백엔드가 아닌 배치 프로세스의 책임이며, API는 이미 계산된 스냅샷 값을 조회용으로 노출한다.

**변경 (v2.1, 2026-07-17)**: 착수 시점 스키마에는 `score`만 있었으나, `/senior/{id}/ranking/` 조회 API 설계 과정에서 순위 표시(예: "전국 247위")에 필요한 `snapshot_date`/`rank_scope`/`rank_position`이 누락되어 있음을 확인해 추가.

---

## 참고 — API 연동 관련 메모

중간보고서 5.2절 기준으로, 아래 엔드포인트가 이 스키마와 직접 연결된다.

**구현 완료 (중간보고서 시점)**
- `/auth/senior/register/`, `/auth/senior/login/` → `senior`
- `/auth/guardian/register/`, `/auth/guardian/login/` → `guardian`
- `/senior/{id}/`, `/guardian/{id}/` (조회/수정) → `senior`, `guardian`
- `/exercises/`, `/exercises/{id}/` → `exercise`

**구현 예정 (중간보고서 시점, 이번 재개발에서 우선순위 대상)**
- `/senior/{id}/ranking/` → `ranking_snapshot`
- `/guardian/{id}/seniors/` (조회/등록/해제) → `guardian_senior_map`
- `/senior/{id}/missions/` → `exercise_mission`
- `/senior/{id}/sessions/`, `.../feedback/` → `exercise_session`, `pose_feedback`
- `/senior/{id}/ability-log/` → `physical_ability_log`
- `/emergency/`, `/emergency/{event_id}/`, `.../notify/`, `.../camera-grant/` → `emergency_event`, `emergency_notification`, `camera_access_grant`
- `/senior/{id}/activity-log/` → `activity_log`

이번 재개발은 이 문서(v2 스키마)를 기준으로 처음부터 다시 구현하며, 위 API 목록은 우선순위 참고용이지 기존 코드가 남아있다는 의미는 아니다 (완전히 새로 작성).