# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 구조 및 필수 참고 문서

`silvervision`은 `frontend/`(Expo/React Native 앱)와 `backend/`(Django REST API)로 구성된 모노레포다. 각 영역에는 이 루트 문서보다 더 상세한 `AGENTS.md`가 있으며, 해당 영역에서 작업하기 전 반드시 먼저 읽을 것:

- 프론트엔드 작업 → [frontend/AGENTS.md](frontend/AGENTS.md) (기술 스택, 화면 포팅 현황, 네비게이션/상태관리 구조)
- 백엔드 작업 → [backend/AGENTS.md](backend/AGENTS.md) (기술 스택, AI 모델 경계, 구현 현황), DB 스키마는 [backend/DB_SCHEMA.md](backend/DB_SCHEMA.md), 보안 필수 규칙은 [backend/claude-security-guidance.md](backend/claude-security-guidance.md)
- 커밋/브랜치/PR 규칙 → 루트 [CONTRIBUTING.md](CONTRIBUTING.md), 백엔드 세부 규칙 [backend/CONTRIBUTING.md](backend/CONTRIBUTING.md)

`frontend/CLAUDE.md`·`backend/CLAUDE.md`는 각각 같은 폴더의 `AGENTS.md`를 `@`로 포함한 것이라 내용이 동일하다.

**주의 — 문서 드리프트는 예상 못한 곳에서 생긴다**: "구현 현황/진행 상태"를 서술하는 절은 하위 `AGENTS.md`든 이 루트 문서든 실제 코드보다 뒤처지기 쉽다. 특정 하위 문서(예: `backend/AGENTS.md`, `frontend/AGENTS.md`)만 갱신 지시를 반복해서 받다 보면 정작 그 문서를 요약·인용하는 상위 문서(루트 `AGENTS.md`, 이 파일)가 갱신 대상에서 빠져 오히려 더 뒤처질 수 있다 — 2026-09-05 회귀 점검에서 실제로 backend/frontend `AGENTS.md`는 코드와 정확히 일치했지만, 그 둘을 요약한 루트 `AGENTS.md`의 "현재 진행 상태" 절이 뒤처져 있었다. 따라서 구현 현황은 어떤 문서도 100% 신뢰하지 말고, 항상 코드(`git log`, `backend/api/urls.py`, `frontend/src/screens/` 디렉터리, 테스트 실행 결과 등)로 교차검증할 것. 절을 갱신할 때는 그 절을 인용·요약하는 상위 문서가 있는지도 함께 확인해 같이 갱신한다.

_마지막 전체 교차검증: 2026-09-06 (비전 갈래 ↔ 백엔드 갈래 병합) — 백엔드 엔드포인트 24개, `api/tests.py` 85건 전체 통과, 마이그레이션 `0001`~`0007`. 프론트 제품 화면 18개(`AbilityHistoryScreen` 포함) 전체 API 연동 + 개발 전용 `PoseSmokeTestScreen` 1개, `npx tsc --noEmit` 통과. 카메라 기반 운동 자세 매칭·낙상 감지가 `frontend/src/pose/`로 이식돼 운동 세션(`completion_rate`)·응급 이벤트(`POST /emergency/`)로 백엔드에 연결됨(frontend/AGENTS.md 9장). 남은 비전 연동 대기: `PoseFeedback.deviation`·`accuracy_avg`(matcher가 boolean만 반환 → `POST .../feedback/`는 프론트 호출자 없이 휴면), `AlertDetailScreen` 상세 타임라인(`TIMELINE`) 목업, `AbilityHistoryScreen` 기록 생성 `POST` 보류. 이후 코드가 바뀌었다면 이 문단도 다시 신뢰할 수 없다._

_2026-09-08 갱신: FCM 제거 → 솔라피(Solapi) SMS 실발송으로 교체. 마이그레이션 `0008`(`EmergencyNotification.channel` default `'fcm'`→`'sms'`) 추가. `.../notify/`가 `backend/api/sms.py`로 연동 보호자에게 실제 SMS를 보낸다(`SOLAPI_*` env 미설정 시 발송 스킵, `solapi` 패키지 `requirements.txt`에 추가)._

_2026-09-09 갱신: `.../notify/` 중복 SMS 버그 수정. 마이그레이션 `0009`(`EmergencyNotification` unique_together `(event, guardian)`) 추가로 현재 `0001`~`0009`. `EmergencyNotifyView`는 이미 `notified`인 event 재호출 시 row·SMS를 재생성하지 않고 기존 이력만 200으로 반환한다(처음 전이 시에만 201 + 생성 + 발송), race는 `get_or_create`로 흡수. `api/tests.py`는 87건 통과(멱등성 테스트 2건 추가)._

이 문서는 두 영역을 아우르는 명령어와 아키텍처 요약만 다룬다. 화면 목록, 테이블 전체 목록 등 세부사항은 중복 기술하지 않으므로 위 문서를 참고할 것.

## 프로젝트 개요

노년층(시니어)의 홈 트레이닝을 돕고 낙상·무활동 등 응급 상황을 보호자에게 알리는 서비스. Computer Vision 기반 자세 추정/분류(BlazePose)는 **이 저장소 밖에서 별도로 개발되는 세 번째 영역**(`VideoTensor` — 병합 전 저장소 `2026-silvervision-main/VideoTensor/`에 있는 프로토타입 앱)이며, `frontend/`·`backend/` 어디에도 새로 구현하지 않는다. 단, `VideoTensor`에서 실기기로 검증된 자세 매칭/낙상 감지 판정 로직(모델 학습·추론 자체는 제외)은 **사람이 직접 `frontend/src/pose/`로 포팅**하는 것이 이미 확립된 절차다 — 대응 관계와 동기화 체크리스트는 `frontend/docs/ASSEMBLY.md` 참고. 이 절차를 벗어난 AI 관련 코드 추가 요청을 받으면 범위 밖임을 알리고 확인을 구한다.

## 명령어

### 백엔드 (`backend/`)

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1      # Windows
source venv/bin/activate          # macOS/Linux
pip install -r requirements.txt

# .env.example을 참고해 .env를 로컬에 생성 (SECRET_KEY/DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT), git에 커밋하지 않는다
# DEBUG 코드 기본값은 False다 — 로컬 개발은 .env에 DEBUG=True를 넣어야 오류 페이지가 뜨고
# ALLOWED_HOSTS 미설정이어도 요청이 400으로 막히지 않는다 (settings.py, .env.example 참고)
# MySQL 8.x가 필요하다: 저장소 루트의 `docker compose up -d`(compose.yaml)로 띄우거나 로컬 설치.
# DB/계정은 DB_SCHEMA.md 기준. `python manage.py seed_demo`로 개발용 계정·운동·알림 시드 가능

python manage.py migrate
python manage.py runserver        # http://localhost:8000, API는 /api/v1/, admin은 /admin/

python manage.py check                       # 시스템 체크
python manage.py makemigrations --check       # 누락된 마이그레이션 확인 (모델 변경 후 필수)
python manage.py test                         # 전체 테스트 — api/tests.py 87건
python manage.py test api.tests.ClassName.test_method   # 단일 테스트
```

패키지를 새로 설치하면 `pip freeze > requirements.txt`로 갱신해 커밋에 포함한다. `requirements.txt`는 현재 UTF-16으로 저장돼 있으니 편집 시 인코딩을 유지한다.

운동 콘텐츠(`Exercise`) 등 마스터 데이터를 채우는 시드 스크립트나 fixture는 없다 — `/admin/`에서 직접 넣기 전까지 `GET /exercises/` 같은 목록 API는 빈 배열을 반환한다.

### 프론트엔드 (`frontend/`)

```bash
cd frontend
npm install

# .env.example을 .env로 복사 (EXPO_PUBLIC_API_BASE_URL — 미설정 시 http://localhost:8000/api/v1 로 폴백).
# .env는 git에 커밋하지 않는다.

npx expo start --web    # 크롬 프리뷰 (카메라를 쓰는 ExerciseProgress/PoseSmokeTest는 웹에서 동작하지 않음)

# 카메라 기반 포즈 기능(운동 매칭/낙상 감지)은 커스텀 네이티브 모듈이라 Expo Go로 실행할 수 없다.
# 개발 빌드가 필요하며, android/ 네이티브 코드나 config plugin이 바뀌면 prebuild부터 다시 한다.
npx expo prebuild --clean       # app.json + plugins/withPoseDetector.js로 android/ 생성
npx expo run:android            # USB 연결된 기기에 debug APK 설치 + Metro 실행
adb reverse tcp:8000 tcp:8000   # 폰의 localhost:8000 → 개발 PC 백엔드로 포워딩
                                # (이 덕분에 .env를 기본값 그대로 둬도 실기기에서 백엔드에 닿는다)

npx tsc --noEmit        # strict TypeScript 타입 체크 (별도 lint/test npm 스크립트는 정의되어 있지 않음)
```

## 백엔드 아키텍처

- Django 6.0.7 + DRF + MySQL(`mysqlclient`), 인증은 `djangorestframework_simplejwt` 기반이지만 커스텀 authentication 클래스를 사용한다.
- **Senior/Guardian은 별도 로그인 주체**: Django `AUTH_USER_MODEL`로 통합하지 않고 [backend/api/models.py](backend/api/models.py)에 독립된 일반 모델로 존재하며, 각각 `set_password`/`check_password`(Django hasher)를 갖는다. JWT는 로그인 뷰(`views.py`)에서 직접 발급하고 `role: senior|guardian` + `user_id` 커스텀 클레임을 담는다.
- [backend/api/authentication.py](backend/api/authentication.py)의 `RoleBasedJWTAuthentication`(`JWTAuthentication` 서브클래스, `settings.REST_FRAMEWORK`에 기본 인증 클래스로 등록)이 토큰의 `role` 클레임으로 `Senior`/`Guardian` 중 조회할 모델을 정하고 `request.user`에 담는다.
- [backend/api/permissions.py](backend/api/permissions.py): `IsSenior`/`IsGuardian`은 타입만 확인하고, `IsOwnerSelf`(서브클래스 `IsSeniorSelf`/`IsGuardianSelf`)는 URL의 `{id}`와 토큰 소유자 본인의 id가 일치하는지 확인하는 IDOR 방지 공통 로직이다 — "본인 리소스만 접근" 가능해야 하는 엔드포인트에 재사용한다. `senior_id`가 URL에 없는 응급 관련 엔드포인트는 `IsSeniorOrGuardian`(로그인 여부만 확인) + 각 뷰의 `get_queryset()`에서 `GuardianSeniorMap` 기반 필터링으로 권한을 처리한다.
- URL은 `/api/v1/`([backend/config/urls.py](backend/config/urls.py)) 아래 [backend/api/urls.py](backend/api/urls.py)에 등록되며, 인증 → 계정 조회/수정 → 운동 미션 → 운동 세션/피드백 → 응급(이벤트/알림/카메라 접근) 순으로 그룹화되어 있다. 새 엔드포인트를 추가할 때 이 그룹 구조를 따른다.
- `models.py`는 DB_SCHEMA.md의 13개 테이블(계정/운동/기록/응급/게임화 5개 영역)을 전부 구현한다. **모델 필드를 바꾸면 반드시 `backend/DB_SCHEMA.md`도 함께 갱신**한다 (스키마 문서가 기준).
- 뷰·시리얼라이저는 **액션별로 분리**한다 — `ExerciseMissionCreateSerializer` vs `ExerciseMissionSerializer`, `ExerciseSessionStartSerializer`/`...CompleteSerializer`, `...StatusUpdateSerializer` 등. 한 리소스에 목록/생성/부분수정이 섞이면 새 시리얼라이저를 만든다.
- **URL·토큰이 body보다 우선**: 생성/수정 시 body에 담긴 소유자 참조(`senior` 등)를 신뢰하지 않고 URL kwarg나 `request.user`로 덮어쓴다(`save(senior=request.user)`). 소유자 필드는 시리얼라이저에서 read-only로 두며, 다른 시니어 명의로 리소스를 만드는 IDOR을 막는 `views.py` 전반의 규칙이다. mission/session/feedback 등에서 URL의 `senior_id` 소속이 아닌 하위 리소스 id는 `get_queryset()` 필터로 404 처리한다.
- `EmergencyEvent.status`는 [serializers.py](backend/api/serializers.py)의 `EMERGENCY_EVENT_TRANSITIONS` 그래프(`detected → first_check → (false_alarm | notified) → resolved`)를 따르는 전이만 허용한다. AI 경계와 별개로 이 상태 머신은 백엔드가 소유하는 로직이다.
- **AI 모델 경계**: 백엔드는 자세 추정/분류 로직을 구현하지 않는다. `ExerciseSession.completion_rate`/`accuracy_avg`, `PoseFeedback.deviation`, `EmergencyEvent.event_type`/`detection_source`는 모두 클라이언트(AI 파트)가 이미 계산해서 보낸 값을 검증 후 저장·조회만 한다. 임계값 판정, 낙상 감지 알고리즘 등 애매한 경계의 로직을 요청받으면 임의로 구현하지 말고 사용자에게 확인한다.

## 프론트엔드 아키텍처

- Expo(~55) + React Native + TypeScript(strict). **단일 flat native-stack 네비게이터** — 중첩 탭 네비게이터는 없다. `App.tsx`의 `Stack.Navigator`(`headerShown: false`) 아래 시니어/보호자 전체 화면이 평면적으로 등록되어 있고, 하단 탭바처럼 보이는 `TabScreenLayout`/`GuardianTabScreenLayout` 컴포넌트가 `navigation.navigate()`로 스택 이동을 흉내낸다(이미 스택에 있는 화면이면 pop, 없으면 push).
- 화면별 route params는 [frontend/src/navigation/types.ts](frontend/src/navigation/types.ts)의 `RootStackParamList`에서 관리 — 새 화면/params 추가 시 이 파일부터 갱신한다.
- **API 레이어는 [frontend/src/api/client.ts](frontend/src/api/client.ts) 하나**: `apiClient.{get,post,patch,delete}`, JWT access/refresh를 `AsyncStorage`에 저장하고 인증 요청에 자동 첨부, `ApiError`/`getApiErrorMessage`로 DRF 에러(`{detail}` 또는 `{field: [...]}`) 처리, `auth: true` 요청에서 401이 오면 `POST /auth/token/refresh/`로 access token을 1회 재발급받아 재시도하고(동시 401은 `inFlightRefresh`로 1회 묶음), 그것마저 401이면 세션을 자동 삭제한다. `auth: false`(로그인/회원가입) 요청의 401은 자격 증명 오류라 재발급 없이 즉시 실패시킨다. 응답 타입 인터페이스도 이 파일에 모으고 각 인터페이스 주석에 대응하는 백엔드 시리얼라이저를 명시한다. 연동 시 요청/응답 형식은 실제 `backend/api/serializers.py`·`views.py`에서 확인하고, 불명확하면 임의 가정 대신 사용자에게 확인한다.
- 화면 간 공유 전역 상태는 [frontend/src/context/AppStateContext.tsx](frontend/src/context/AppStateContext.tsx)(`useAppState()` 훅)에 있다. 백엔드 연동은 **제품 화면 18개 전체 완료**됐고(개발 전용 `PoseSmokeTestScreen` 별도), 대부분의 화면은 `AppStateContext` 대신 화면 로컬 상태(`useFocusEffect` 포커스 재조회)를 쓴다. `AppStateContext`에는 로그인·프로필 PATCH로 채워지는 `userProfile`/`guardianProfile`만 남고(`SeniorHome`/`GuardianHome` 인사말 등이 소비) 목업 상수는 `DEFAULT_PROFILE`/`DEFAULT_GUARDIAN`(로그인 전 플레이스홀더)만 남았다. 상세는 [frontend/AGENTS.md](frontend/AGENTS.md) 7장. 백엔드 enum → 화면 표시 라벨 변환은 `Record<enum, label>` 타입으로 만들어 enum 확장 시 컴파일 타임에 누락이 드러나게 한다.
- 디자인 소스는 이 레포 밖 형제 폴더 `../ai-studio-reference`(Google AI Studio 생성 웹 React+Tailwind 프로토타입)다 — 참고용일 뿐 실행 대상이 아니며, 그대로 복사하지 않고 RN으로 "포팅"한다(`div/span/button` → `View/Text/Pressable`, Tailwind → `StyleSheet`+theme 토큰, `lucide-react` → `lucide-react-native`, `hover` → `Pressable`의 `pressed` 스타일, `motion/react` 애니메이션은 우선 정적으로 구현).
- 색상/폰트 크기/간격은 [frontend/src/theme/theme.ts](frontend/src/theme/theme.ts) 토큰만 사용하고 하드코딩하지 않는다. **시니어 UI 규칙**: 폰트 20pt 이상, 터치 타겟 56dp 이상(`theme.MIN_TOUCH_TARGET`).
- 화면은 `src/screens/{common,senior,guardian}/`로 나뉘며 전체 포팅 완료 상태다 — 화면별 상세 현황은 frontend/AGENTS.md 표를 참고.
- `src/pose/{exercise,fall}/`에 카메라 기반 운동 자세 매칭·낙상 감지 판정 로직이 구현되어 있다(`ExerciseProgressScreen`/`PoseSmokeTestScreen`에서 사용). `VideoTensor` 프로토타입에서 수동 포팅된 코드이며 위 "프로젝트 개요"의 AI 경계 예외에 해당한다 — 어떤 운동이 어느 시퀀스를 쓰는지는 백엔드 `Exercise.pose_workout_key`가 정한다. 자세한 내용은 frontend/AGENTS.md 9장 참고.

## 협업 규칙 요약

- 브랜치: `feature/frontend-*`, `feature/backend-*`, `fix/*`, `chore/*`. `main`에 직접 커밋하지 않고 PR로만 반영.
- 커밋: Conventional Commits, scope에 `frontend`/`backend` 명시 권장 (예: `feat(backend): ...`).
- 프론트엔드/백엔드가 섞인 PR은 가능하면 분리한다. API 스펙 변경처럼 분리 불가능한 경우 PR 설명에 `Breaking: API 변경`을 명시하고 양쪽 담당자를 리뷰어로 지정한다.
- 백엔드 보안 필수 규칙(비밀번호 해시 노출 금지, `.env` 하드코딩 금지, IDOR 방지, `camera_access_grant.expires_at` 체크, JWT role 클레임 검증, raw SQL 파라미터 바인딩)은 [backend/claude-security-guidance.md](backend/claude-security-guidance.md)를 인증/권한 코드 작성 전 반드시 확인한다.

## 커뮤니케이션 규칙
- 작업 완료 보고, 판단 근거 설명 등 모든 응답은 한국어로 작성한다.
