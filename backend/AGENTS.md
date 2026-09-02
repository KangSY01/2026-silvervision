# AGENTS.md (backend)

## 1. 프로젝트 개요

실버비전(SilverVision) 백엔드 — 시니어(피보호자)의 운동 기록·응급 이벤트·보호자 연동을 저장·조회하는 Django REST API 서버다. 전체 프로젝트 맥락(모노레포 구조, 두 영역 간 경계)은 [루트 AGENTS.md](../AGENTS.md)를 먼저 참고할 것.

## 2. 기술 스택

- Django 6.0.7 (Python 3.12, venv는 `backend/venv/`)
- MySQL 8.x + `mysqlclient` — `config/settings.py`의 `DATABASES`가 `.env`(`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`)를 읽는다
- `djangorestframework` + `djangorestframework_simplejwt` — JWT 인증 (커스텀 인증/권한 클래스는 5장 참고)
- `django-cors-headers` — 개발 단계 CORS 전체 허용(`CORS_ALLOW_ALL_ORIGINS = True`)
- `python-dotenv` — `SECRET_KEY` 등 비밀값을 `.env`에서 로드 (`.env`는 git에 커밋하지 않음, `.env.example` 참고)

## 3. AI 모델 경계

이 백엔드는 **AI 자세 추정/분류 로직을 구현하지 않는다.** BlazePose 키포인트 추출, 관절 각도 계산, 낙상·무활동 경량 분류기(MLP/LSTM) 등은 별도 담당자(AI 파트)가 프론트엔드 온디바이스에서 처리하며, 이 저장소의 범위 밖이다.

백엔드가 하는 일은 **"이미 계산된 결과값을 저장·조회하는 API 제공"까지다.** 구체적으로:

- `ExerciseSession`의 `completion_rate`/`accuracy_avg`: 클라이언트(AI 파트)가 계산해서 보낸 값을 검증 후 저장한다. 백엔드가 이 수치를 직접 계산하는 로직을 작성하지 않는다.
- `PoseFeedback`의 `joint_name`/`deviation`: 클라이언트가 계산한 관절별 편차값을 그대로 저장한다. 각도 계산 공식이나 기준값 비교 로직을 백엔드에 구현하지 않는다.
- `EmergencyEvent`의 `event_type`/`detection_source`: 클라이언트(비전 모델/센서)가 감지해서 보낸 이벤트를 기록·전파(알림 발송 등)한다. 낙상/무활동을 판별하는 알고리즘 자체는 백엔드에 없다.

애매한 경계에 있는 로직(예: "편차가 특정 임계값을 넘으면 이상 행동으로 간주"하는 임계치 로직이 백엔드/AI 중 어느 쪽 책임인지, 또는 낙상 감지 후 `emergency_event` 생성을 백엔드가 트리거해야 하는지 클라이언트가 트리거하는지)가 나오면, **임의로 판단해서 구현하지 말고 먼저 사용자에게 확인한다.**

## 4. DB 스키마 및 보안 규칙

- DB 테이블 설계 기준은 [DB_SCHEMA.md](DB_SCHEMA.md) (전체 13개 테이블, 계정/운동/기록/응급/게임화 5개 영역)를 따른다. 모델(`api/models.py`) 필드를 바꿀 일이 있으면 이 문서와 먼저 대조할 것.
- 보안 관련 필수 규칙은 [claude-security-guidance.md](claude-security-guidance.md)에 정리되어 있다 (비밀번호 해시 노출 금지, `.env` 값 하드코딩 금지, 응급 데이터 IDOR 방지, `camera_access_grant` 만료 체크, JWT role 클레임 검증 등). 인증/권한 관련 코드를 작성하기 전 반드시 확인한다.

## 5. 현재 구현 상태

실제 `api/urls.py`(전부 `/api/v1/` 하위) 라우팅 기준이다. 문서와 코드가 어긋나면 코드가 기준이며, 이 절을 갱신할 것.

### 모델 / 마이그레이션

`DB_SCHEMA.md`의 13개 테이블 모두 `api/models.py`에 구현 완료 (`Senior`, `Guardian`, `GuardianSeniorMap`, `Exercise`, `ExerciseMission`, `ExerciseSession`, `PoseFeedback`, `PhysicalAbilityLog`, `EmergencyEvent`, `EmergencyNotification`, `CameraAccessGrant`, `ActivityLog`, `RankingSnapshot`). 마이그레이션 `0001`~`0006` MySQL 적용 및 컬럼/FK 검증 완료.

### 인증 / 권한 (구현 완료)

- `Senior`/`Guardian`은 독립된 두 로그인 주체라 `AUTH_USER_MODEL`로 통합하지 않고 각각 일반 모델 + `set_password`/`check_password`(Django hasher)로 처리한다. JWT는 로그인 뷰(`views._issue_tokens`)에서 직접 발급하며 `role: senior|guardian` + `user_id` 커스텀 클레임을 담는다.
- `api/authentication.py`의 **`RoleBasedJWTAuthentication`**(`JWTAuthentication` 서브클래스)가 `settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`에 등록돼 있고, 토큰의 `role` 클레임으로 `Senior`/`Guardian` 중 조회할 모델을 정해 `request.user`에 담는다.
- `api/permissions.py`: **`IsSenior`/`IsGuardian`**(타입 확인), **`IsOwnerSelf`**(URL `{id}` == 토큰 본인, IDOR 방지) + 서브클래스 **`IsSeniorSelf`/`IsGuardianSelf`**, **`IsSeniorOrGuardian`**(로그인 여부만). `IsOwnerSelf` 계열은 프로필·미션·세션·보호자매핑 뷰에서 재사용 중이다. `senior_id`가 URL에 없는 응급 엔드포인트는 `IsSeniorOrGuardian` + 각 뷰 `get_queryset()`의 `_visible_emergency_events`(본인 소유 또는 `GuardianSeniorMap` 연결 보호자) 필터로 권한을 처리한다.

### 엔드포인트 (섹션별 구현 현황)

| 섹션 | Method | 경로 | 권한 |
|---|---|---|---|
| **인증** | POST | `auth/senior/register/`, `auth/senior/login/` | AllowAny |
| | POST | `auth/guardian/register/`, `auth/guardian/login/` | AllowAny |
| **계정** | GET·PUT·PATCH | `senior/{senior_id}/` | `IsSeniorSelf` |
| | GET·PUT·PATCH | `guardian/{guardian_id}/` | `IsGuardianSelf` |
| | GET·POST | `guardian/{guardian_id}/seniors/` — 매핑 목록 / 등록 | `IsGuardianSelf` |
| | DELETE | `guardian/{guardian_id}/seniors/{senior_id}/` — 연결 해제 | `IsGuardianSelf` |
| **운동** | GET | `exercises/`, `exercises/{exercise_id}/` | IsAuthenticated |
| | GET·POST | `senior/{senior_id}/missions/` | `IsSeniorSelf` |
| | PATCH | `senior/{senior_id}/missions/{mission_id}/` — status만 | `IsSeniorSelf` |
| **기록** | GET·POST | `senior/{senior_id}/sessions/` — 목록 / 세션 시작 | `IsSeniorSelf` |
| | GET·PATCH | `senior/{senior_id}/sessions/{session_id}/` — GET은 `pose_feedback` nested / PATCH는 `completion_rate`·`accuracy_avg` | `IsSeniorSelf` |
| | POST | `senior/{senior_id}/sessions/{session_id}/feedback/` — bulk 저장 | `IsSeniorSelf` |
| **응급** | GET·POST | `emergency/` — GET은 `IsSeniorOrGuardian` + `_visible_emergency_events`, POST는 `IsSenior`(시니어 본인만 생성) | (method별) |
| | GET·PATCH | `emergency/{event_id}/` — GET은 `emergency_notification`·`camera_access_grant` nested / PATCH는 status 전이(`notified` 제외) | `IsSeniorOrGuardian` + `_visible_emergency_events` |
| | POST | `emergency/{event_id}/notify/` — 알림 row 생성 (FCM 실발송은 범위 밖) | `IsSeniorOrGuardian` |
| | POST·DELETE | `emergency/{event_id}/camera-grant/` — DELETE는 즉시 만료 처리 | `IsSeniorOrGuardian` |
| **게임화** | — | (엔드포인트 없음) | — |

- 매핑 등록(POST `.../seniors/`)은 `registered_via` + (`login_id` | `barcode_code`)를 받아 **서버가 senior를 조회**한다. 중복 등록 **409**, 미존재 식별자 **404**. 판단 근거는 `DB_SCHEMA.md` "API 연동 관련 메모" 참고.

### 시리얼라이저

`api/serializers.py`에 13개 테이블 전 영역 작성 완료. 액션별로 분리돼 있다(예: `ExerciseMissionSerializer`/`...CreateSerializer`/`...StatusUpdateSerializer`, `ExerciseSession` start/complete/detail, `EmergencyEvent` 생성/status-update/detail). `PhysicalAbilityLogSerializer`·`ActivityLogSerializer`·`RankingSnapshotSerializer`는 작성돼 있으나 대응 뷰·URL이 아직 없다.

### 미구현 (구현 예정)

| 섹션 | 항목 |
|---|---|
| 인증 | 토큰 refresh(재발급), 로그아웃, 비밀번호 변경/재설정. 매핑 등록 전 시니어 검색 API 없음 |
| 기록 | `senior/{id}/ability-log/` → `physical_ability_log` (시리얼라이저만 존재) |
| 응급 | `activity_log`(무활동 감지 로그) 저장/조회 API — 모델·시리얼라이저만 존재 |
| 게임화 | **섹션 전체 미구현.** `senior/{id}/ranking/` → `ranking_snapshot` 조회, `Senior.fruit_count` 증감(운동 보상) 로직 전무. 모델·시리얼라이저·admin만 존재 |

### 테스트

`api/tests.py`에 보호자-피보호자 매핑 + 세션/응급 GET 엔드포인트 테스트 25건(DRF `APITestCase`). 그 외 영역은 아직 테스트 없음.

## 6. Admin

`api/admin.py`에 구현된 모델을 전부 등록해뒀다 (`/admin/`에서 확인 가능). 새 모델을 추가하면 이 파일에도 등록할 것.
