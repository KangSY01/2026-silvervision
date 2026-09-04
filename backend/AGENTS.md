# AGENTS.md (backend)

## 1. 프로젝트 개요

실버비전(SilverVision) 백엔드 — 시니어(피보호자)의 운동 기록·응급 이벤트·보호자 연동을 저장·조회하는 Django REST API 서버다. 전체 프로젝트 맥락(모노레포 구조, 두 영역 간 경계)은 [루트 AGENTS.md](../AGENTS.md)를 먼저 참고할 것.

## 2. 기술 스택

- Django 6.0.7 (Python 3.12, venv는 `backend/venv/`)
- MySQL 8.x + `mysqlclient` — `config/settings.py`의 `DATABASES`가 `.env`(`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`)를 읽는다
- `djangorestframework` + `djangorestframework_simplejwt` — JWT 인증 (커스텀 인증/권한 클래스는 5장 참고). `rest_framework_simplejwt.token_blacklist` 앱을 `INSTALLED_APPS`에 추가해 로그아웃 시 refresh token을 실제로 무효화한다(마이그레이션은 패키지 동봉, `migrate`만 필요).
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

`DB_SCHEMA.md`의 13개 테이블 모두 `api/models.py`에 구현 완료 (`Senior`, `Guardian`, `GuardianSeniorMap`, `Exercise`, `ExerciseMission`, `ExerciseSession`, `PoseFeedback`, `PhysicalAbilityLog`, `EmergencyEvent`, `EmergencyNotification`, `CameraAccessGrant`, `ActivityLog`, `RankingSnapshot`). 마이그레이션 `0001`~`0006` MySQL 적용 및 컬럼/FK 검증 완료. 그 외 `token_blacklist` 앱이 자체 테이블 2개(`OutstandingToken`/`BlacklistedToken`)를 추가하나 라이브러리가 관리하며 `api` 앱 마이그레이션에는 영향이 없다(`makemigrations --check`는 여전히 "No changes").

### 인증 / 권한 (구현 완료)

- `Senior`/`Guardian`은 독립된 두 로그인 주체라 `AUTH_USER_MODEL`로 통합하지 않고 각각 일반 모델 + `set_password`/`check_password`(Django hasher)로 처리한다. JWT는 로그인 뷰(`views._issue_tokens`)에서 직접 발급하며 `role: senior|guardian` + `user_id` 커스텀 클레임을 담는다.
- **회원가입 비밀번호 규칙은 역할별로 다르다** (등록 시리얼라이저에서만 검증 — 로그인은 `check_password` 해시 비교만 하므로 규칙과 무관):
  - **시니어(`SeniorRegisterSerializer`)**: **정확히 4자리 숫자(0-9)**. 시니어 접근성을 위해 로그인 화면(`frontend` `LoginScreen`)이 "숫자 4자리 PIN" UX로 고정 설계돼 있고, 그 화면 문구가 단일 소스라 "4자리 이상"으로 여지를 두면 시니어가 5자리로 등록해 두고 4자리 화면에서 혼란을 겪을 수 있어 정확히 4자리만 허용한다. 에러 메시지 `"비밀번호는 숫자 4자리로 입력해 주세요."`.
  - **보호자(`GuardianRegisterSerializer`)**: 기존 규칙 유지 — **8자 이상 + 영문·숫자 조합 필수**(`min_length=8` + `validate_password`가 `isdigit()`/`isalpha()` 단일 종류 거부). 보호자는 일반 성인 UX라 완화하지 않는다.
  - 4자리 숫자 PIN은 엔트로피가 낮으므로(10^4), 이후 강화가 필요하면 PIN 규칙을 되돌리는 대신 로그인 rate limit·계정 잠금을 별도로 도입한다.
- `api/authentication.py`의 **`RoleBasedJWTAuthentication`**(`JWTAuthentication` 서브클래스)가 `settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`에 등록돼 있고, 토큰의 `role` 클레임으로 `Senior`/`Guardian` 중 조회할 모델을 정해 `request.user`에 담는다.
- **토큰 재발급(`POST /auth/token/refresh/`)**: simplejwt 5.5의 내장 `TokenRefreshSerializer`는 refresh token의 `user_id` 클레임(= `USER_ID_CLAIM` 기본값 `"user_id"`, `_issue_tokens`가 심는 커스텀 클레임과 이름이 겹침)으로 `AUTH_USER_MODEL`을 무조건 조회하는데, 이 프로젝트는 Senior/Guardian을 `AUTH_USER_MODEL`로 통합하지 않아 항상 `User.DoesNotExist`로 터진다. 그래서 사용자 모델 조회를 걷어낸 커스텀 `TokenRefreshSerializer`(`api/serializers.py`)로 교체했다 — 토큰 서명·만료·blacklist 검증만 하고, `no_copy_claims`(token_type/exp/jti/iat) 외 커스텀 클레임(role/user_id)은 simplejwt가 새 access token으로 복사한다. `ROTATE_REFRESH_TOKENS`는 기본값(False)이라 응답은 `{access}`만. 뷰(`TokenRefreshView`)는 내장 뷰 골격을 재사용하되 만료·위조·blacklist 토큰 에러를 `{'detail': 한국어}` 401로 정규화한다.
- **로그아웃(`POST /auth/logout/`)**: 클라이언트 로컬 삭제(`clearSession`)만으로 끝내지 않고 서버에서 refresh token을 blacklist해 실제로 무효화한다 — 응급 상황에서 보호자에게 카메라/GPS를 여는 서비스라 탈취된 refresh token(기본 수명 1일, rotation 미설정)이 로그아웃 후에도 access token을 계속 찍어내면 위험하다는 판단. `token_blacklist` 앱 + `migrate` 한 번이 비용의 전부. 권한 `AllowAny`(만료된 access로도 로그아웃 가능해야 하고 body의 refresh token 자체가 소유 증명), 이미 무효인 토큰도 205로 멱등 통과. 한계: blacklist는 refresh token만 걸리고 직전 발급된 access token은 남은 수명(기본 5분)동안 유효하다.
- `api/permissions.py`: **`IsSenior`/`IsGuardian`**(타입 확인), **`IsOwnerSelf`**(URL `{id}` == 토큰 본인, IDOR 방지) + 서브클래스 **`IsSeniorSelf`/`IsGuardianSelf`**, **`IsSeniorOrGuardian`**(로그인 여부만), **`IsSeniorSelfOrMappedGuardian`**(URL `senior_id` 본인 **또는** 그 시니어와 `GuardianSeniorMap`으로 연결된 보호자). `IsOwnerSelf` 계열은 프로필·미션·세션 쓰기·보호자매핑 뷰에서 재사용 중이다. `senior_id`가 URL에 없는 응급 엔드포인트는 `IsSeniorOrGuardian` + 각 뷰 `get_queryset()`의 `_visible_emergency_events`(본인 소유 또는 `GuardianSeniorMap` 연결 보호자) 필터로 권한을 처리한다.
- **시니어 프로필·세션 목록/상세·활동 로그의 조회(GET)는 매핑된 보호자에게도 열려 있다** — `IsSeniorSelfOrMappedGuardian`을 GET에만 물리고(각 뷰 `get_permissions()`), 쓰기(프로필 PUT/PATCH, POST 세션 시작·활동로그 기록, PATCH 세션 완료)는 `IsSeniorSelf`로 시니어 본인만 유지한다(보호자는 피보호자 프로필 수정 불가). 응급 배치와 같은 "본인 또는 매핑된 보호자" 가시성 기준이되, 매핑 안 된 보호자·타 시니어는 **403**(스코프 권한은 permission 계층이, 스코프 안 하위 리소스 존재 여부는 `get_queryset()`이 404로 — 계층 분리). 응급 이벤트가 404로 통일한 건 URL에 `senior_id`가 없어 대조할 스코프가 없었기 때문이라 여기선 재현하지 않는다.
- **`GET /senior/{id}/` 개인정보 노출 범위**: 매핑된 보호자는 `SeniorProfileSerializer` 전체(`login_id`/`name`/`phone`/`address`/`diseases`/`medication`/`mobility_level`/`barcode_code`/`fruit_count`)를 받는다. 착수·중간보고서 화면 설계상 보호자 피보호자 상세 화면(`SeniorDetailScreen`)이 질환·주소·복용약을 표시하도록 되어 있어 의도된 노출이다. `password_hash`는 시리얼라이저 `fields`에 없어 애초에 나가지 않는다. `barcode_code`(보호자 연동용 개인 바코드)도 포함되는데, 이미 그 시니어와 연동을 마친 보호자에게만 보이므로 새 위험은 아니다(연동 자격 증명을 이미 사용한 주체).

### 엔드포인트 (섹션별 구현 현황)

| 섹션 | Method | 경로 | 권한 |
|---|---|---|---|
| **인증** | POST | `auth/senior/register/`, `auth/senior/login/` | AllowAny |
| | POST | `auth/guardian/register/`, `auth/guardian/login/` | AllowAny |
| | POST | `auth/token/refresh/` — `{refresh}` → `{access}`. 만료·위조·blacklist 토큰은 `{'detail'}` 401 | AllowAny |
| | POST | `auth/logout/` — `{refresh}` blacklist, 성공 205(무효 토큰도 멱등 통과) | AllowAny |
| **계정** | GET·PUT·PATCH | `senior/{senior_id}/` | GET `IsSeniorSelfOrMappedGuardian` / PUT·PATCH `IsSeniorSelf` |
| | GET·PUT·PATCH | `guardian/{guardian_id}/` | `IsGuardianSelf` |
| | GET·POST | `guardian/{guardian_id}/seniors/` — 매핑 목록 / 등록 | `IsGuardianSelf` |
| | DELETE | `guardian/{guardian_id}/seniors/{senior_id}/` — 연결 해제 | `IsGuardianSelf` |
| **운동** | GET | `exercises/`, `exercises/{exercise_id}/` | IsAuthenticated |
| | GET·POST | `senior/{senior_id}/missions/` | `IsSeniorSelf` |
| | PATCH | `senior/{senior_id}/missions/{mission_id}/` — status만 | `IsSeniorSelf` |
| **기록** | GET·POST | `senior/{senior_id}/sessions/` — 목록 / 세션 시작 | GET `IsSeniorSelfOrMappedGuardian` / POST `IsSeniorSelf` |
| | GET·PATCH | `senior/{senior_id}/sessions/{session_id}/` — GET은 `pose_feedback` nested / PATCH는 `completion_rate`·`accuracy_avg`(완료 시 fruit/ranking 갱신 트리거) | GET `IsSeniorSelfOrMappedGuardian` / PATCH `IsSeniorSelf` |
| | POST | `senior/{senior_id}/sessions/{session_id}/feedback/` — bulk 저장 | `IsSeniorSelf` |
| | GET·POST | `senior/{senior_id}/activity-log/` — 기기 활동 로그. GET 최신순(기본 100·최대 500건, `?limit`/`?since`), POST 단건·bulk | GET `IsSeniorSelfOrMappedGuardian` / POST `IsSeniorSelf` |
| | GET·POST | `senior/{senior_id}/ability-log/` — 장기 신체 능력(일별). GET `logged_date` 오름차순 전체, POST는 `(senior, logged_date)` upsert(신규 201 / 갱신 200) | `IsSeniorSelf` |
| **응급** | GET·POST | `emergency/` — GET은 `IsSeniorOrGuardian` + `_visible_emergency_events`, POST는 `IsSenior`(시니어 본인만 생성) | (method별) |
| | GET·PATCH | `emergency/{event_id}/` — GET은 `emergency_notification`·`camera_access_grant` nested / PATCH는 status 전이(`notified` 제외) | `IsSeniorOrGuardian` + `_visible_emergency_events` |
| | POST | `emergency/{event_id}/notify/` — 알림 row 생성 (FCM 실발송은 범위 밖) | `IsSeniorOrGuardian` |
| | POST·DELETE | `emergency/{event_id}/camera-grant/` — DELETE는 즉시 만료 처리 | `IsSeniorOrGuardian` |
| **게임화** | GET | `senior/{senior_id}/ranking/` — `{national, regional}` 최신 스냅샷 (없으면 `null`+200) | `IsSeniorSelf` |

- 매핑 등록(POST `.../seniors/`)은 `registered_via` + (`login_id` | `barcode_code`)를 받아 **서버가 senior를 조회**한다. 중복 등록 **409**, 미존재 식별자 **404**. 판단 근거는 `DB_SCHEMA.md` "API 연동 관련 메모" 참고.
- 게임화(2026-09-02 구현): 스케줄러가 없어 `api/gamification.py`가 **세션 완료(`exercise_session.completion_rate` 기록) 시점**에 `Senior.fruit_count`(세션당 +1, 하루 6개 상한, 전량 재계산 방식이라 멱등)와 `ranking_snapshot`(national/regional, `score`="이번 달 완료 세션 수", 표준 경쟁 순위, `regional`은 `senior.address`에서 뽑은 "시/도+구/군" 접두어(`region_key()`)로 그룹핑 — 자유 텍스트라 표기 흔들림엔 취약)을 함께 갱신한다. 수동 배치용 `python manage.py recalculate_rankings` 제공. 상세 근거는 `DB_SCHEMA.md` "API 연동 관련 메모".

### 시리얼라이저

`api/serializers.py`에 13개 테이블 전 영역 작성 완료. 액션별로 분리돼 있다(예: `ExerciseMissionSerializer`/`...CreateSerializer`/`...StatusUpdateSerializer`, `ExerciseSession` start/complete/detail, `EmergencyEvent` 생성/status-update/detail). `RankingSnapshotSerializer`는 `SeniorRankingView`가 scope별로 사용한다(전국/지역을 한 응답에 묶는 건 views.py 몫). `ActivityLogSerializer`는 `senior` read-only + `ActivityLogListSerializer`(bulk_create) 구성으로 `ActivityLogListCreateView`가 쓴다. `PhysicalAbilityLogSerializer`는 `senior` read-only + `logged_date` optional + 점수 음수 거부 구성으로 `PhysicalAbilityLogListCreateView`가 조회·upsert 공용으로 쓴다. 13개 테이블 모두 대응 뷰·URL이 존재한다. 인증 부가용으로 `TokenRefreshSerializer`(내장 대체, 사용자 모델 조회 제거)·`LogoutSerializer`(`refresh` 1필드)가 있다.

### 미구현 (구현 예정)

| 섹션 | 항목 |
|---|---|
| 인증 | 비밀번호 변경/재설정. 매핑 등록 전 시니어 검색 API 없음 |

스키마 13개 테이블에 직결되는 CRUD 엔드포인트는 전부 구현됐다. 토큰 refresh·로그아웃도 구현 완료(위 인증 section 참고). 남은 건 비밀번호 변경/재설정과 시니어 검색 API뿐이다.

### 테스트

`api/tests.py`에 보호자-피보호자 매핑 + 시니어 프로필/세션/응급 GET(매핑된 보호자 조회 허용·미매핑 보호자 403·쓰기 차단 포함) + 게임화(fruit_count·ranking) + 활동 로그 + 신체 능력 로그 + 토큰 refresh/로그아웃(blacklist) + 회원가입 비밀번호 규칙(시니어 4자리 PIN / 보호자 8자 조합) 테스트 82건(DRF `APITestCase`). 그 외 영역은 아직 테스트 없음.

## 6. Admin

`api/admin.py`에 구현된 모델을 전부 등록해뒀다 (`/admin/`에서 확인 가능). 새 모델을 추가하면 이 파일에도 등록할 것.
