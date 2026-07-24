# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 구조 및 필수 참고 문서

`silvervision`은 `frontend/`(Expo/React Native 앱)와 `backend/`(Django REST API)로 구성된 모노레포다. 각 영역에는 이 루트 문서보다 더 상세한 `AGENTS.md`가 있으며, 해당 영역에서 작업하기 전 반드시 먼저 읽을 것:

- 프론트엔드 작업 → [frontend/AGENTS.md](frontend/AGENTS.md) (기술 스택, 화면 포팅 현황, 네비게이션/상태관리 구조)
- 백엔드 작업 → [backend/AGENTS.md](backend/AGENTS.md) (기술 스택, AI 모델 경계, 구현 현황), DB 스키마는 [backend/DB_SCHEMA.md](backend/DB_SCHEMA.md), 보안 필수 규칙은 [backend/claude-security-guidance.md](backend/claude-security-guidance.md)
- 커밋/브랜치/PR 규칙 → 루트 [CONTRIBUTING.md](CONTRIBUTING.md), 백엔드 세부 규칙 [backend/CONTRIBUTING.md](backend/CONTRIBUTING.md)

이 문서는 두 영역을 아우르는 명령어와 아키텍처 요약만 다룬다. 화면 목록, 테이블 전체 목록 등 세부사항은 중복 기술하지 않으므로 위 문서를 참고할 것.

## 프로젝트 개요

노년층(시니어)의 홈 트레이닝을 돕고 낙상·무활동 등 응급 상황을 보호자에게 알리는 서비스. Computer Vision 기반 자세 추정/분류(BlazePose)는 **이 저장소 밖에서 별도로 개발되는 세 번째 영역**이며, `frontend/`·`backend/` 어디에도 구현하지 않는다 — AI 관련 코드 추가 요청을 받으면 범위 밖임을 알리고 확인을 구한다.

## 명령어

### 백엔드 (`backend/`)

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1      # Windows
source venv/bin/activate          # macOS/Linux
pip install -r requirements.txt

# .env.example을 참고해 .env를 로컬에 생성 (SECRET_KEY/DB_NAME/DB_USER/DB_PASSWORD/DB_HOST/DB_PORT), git에 커밋하지 않는다
# MySQL 8.x가 로컬에 떠 있어야 하며 DB_SCHEMA.md 기준으로 DB/계정을 만든다

python manage.py migrate
python manage.py runserver        # http://localhost:8000, API는 /api/v1/, admin은 /admin/

python manage.py check                       # 시스템 체크
python manage.py makemigrations --check       # 누락된 마이그레이션 확인 (모델 변경 후 필수)
python manage.py test                         # 테스트 실행 — 현재 api/tests.py는 비어있어 테스트 코드 없음
```

패키지를 새로 설치하면 `pip freeze > requirements.txt`로 갱신해 커밋에 포함한다.

### 프론트엔드 (`frontend/`)

```bash
cd frontend
npm install
npx expo start          # Metro 개발 서버 — 터미널에서 android/ios/web 선택
npx expo start --web    # 크롬 프리뷰 (네이티브 전용 API를 쓰는 화면은 웹에서 다르게 보일 수 있음)
npx expo start --android
npx expo start --ios

npx tsc --noEmit        # strict TypeScript 타입 체크 (별도 lint/test npm 스크립트는 정의되어 있지 않음)
```

## 백엔드 아키텍처

- Django 6.0.7 + DRF + MySQL(`mysqlclient`), 인증은 `djangorestframework_simplejwt` 기반이지만 커스텀 authentication 클래스를 사용한다.
- **Senior/Guardian은 별도 로그인 주체**: Django `AUTH_USER_MODEL`로 통합하지 않고 [backend/api/models.py](backend/api/models.py)에 독립된 일반 모델로 존재하며, 각각 `set_password`/`check_password`(Django hasher)를 갖는다. JWT는 로그인 뷰(`views.py`)에서 직접 발급하고 `role: senior|guardian` + `user_id` 커스텀 클레임을 담는다.
- [backend/api/authentication.py](backend/api/authentication.py)의 `RoleBasedJWTAuthentication`(`JWTAuthentication` 서브클래스, `settings.REST_FRAMEWORK`에 기본 인증 클래스로 등록)이 토큰의 `role` 클레임으로 `Senior`/`Guardian` 중 조회할 모델을 정하고 `request.user`에 담는다.
- [backend/api/permissions.py](backend/api/permissions.py): `IsSenior`/`IsGuardian`은 타입만 확인하고, `IsOwnerSelf`(서브클래스 `IsSeniorSelf`/`IsGuardianSelf`)는 URL의 `{id}`와 토큰 소유자 본인의 id가 일치하는지 확인하는 IDOR 방지 공통 로직이다 — "본인 리소스만 접근" 가능해야 하는 엔드포인트에 재사용한다. `senior_id`가 URL에 없는 응급 관련 엔드포인트는 `IsSeniorOrGuardian`(로그인 여부만 확인) + 각 뷰의 `get_queryset()`에서 `GuardianSeniorMap` 기반 필터링으로 권한을 처리한다.
- URL은 `/api/v1/`([backend/config/urls.py](backend/config/urls.py)) 아래 [backend/api/urls.py](backend/api/urls.py)에 등록되며, 인증 → 계정 조회/수정 → 운동 미션 → 운동 세션/피드백 → 응급(이벤트/알림/카메라 접근) 순으로 그룹화되어 있다. 새 엔드포인트를 추가할 때 이 그룹 구조를 따른다.
- `models.py`는 DB_SCHEMA.md의 13개 테이블(계정/운동/기록/응급/게임화 5개 영역)을 전부 구현한다. **모델 필드를 바꾸면 반드시 `backend/DB_SCHEMA.md`도 함께 갱신**한다 (스키마 문서가 기준).
- **AI 모델 경계**: 백엔드는 자세 추정/분류 로직을 구현하지 않는다. `ExerciseSession.completion_rate`/`accuracy_avg`, `PoseFeedback.deviation`, `EmergencyEvent.event_type`/`detection_source`는 모두 클라이언트(AI 파트)가 이미 계산해서 보낸 값을 검증 후 저장·조회만 한다. 임계값 판정, 낙상 감지 알고리즘 등 애매한 경계의 로직을 요청받으면 임의로 구현하지 말고 사용자에게 확인한다.

## 프론트엔드 아키텍처

- Expo(~54) + React Native + TypeScript(strict). **단일 flat native-stack 네비게이터** — 중첩 탭 네비게이터는 없다. `App.tsx`의 `Stack.Navigator`(`headerShown: false`) 아래 시니어/보호자 전체 화면이 평면적으로 등록되어 있고, 하단 탭바처럼 보이는 `TabScreenLayout`/`GuardianTabScreenLayout` 컴포넌트가 `navigation.navigate()`로 스택 이동을 흉내낸다(이미 스택에 있는 화면이면 pop, 없으면 push).
- 화면별 route params는 [frontend/src/navigation/types.ts](frontend/src/navigation/types.ts)의 `RootStackParamList`에서 관리 — 새 화면/params 추가 시 이 파일부터 갱신한다.
- 화면 간 공유 전역 상태는 [frontend/src/context/AppStateContext.tsx](frontend/src/context/AppStateContext.tsx)(`useAppState()` 훅)에 있다. **현재 전부 목업 데이터이며 백엔드 연동 전 상태**다 — 위 백엔드 API가 이미 상당 부분 구현되어 있으므로, 연동 작업 시 요청/응답 형식을 backend/AGENTS.md나 실제 `backend/api/serializers.py`·`views.py`에서 확인하고, 불명확하면 임의로 가정하지 말고 사용자에게 확인한다.
- 디자인 소스는 이 레포 밖 형제 폴더 `../ai-studio-reference`(Google AI Studio 생성 웹 React+Tailwind 프로토타입)다 — 참고용일 뿐 실행 대상이 아니며, 그대로 복사하지 않고 RN으로 "포팅"한다(`div/span/button` → `View/Text/Pressable`, Tailwind → `StyleSheet`+theme 토큰, `lucide-react` → `lucide-react-native`, `hover` → `Pressable`의 `pressed` 스타일, `motion/react` 애니메이션은 우선 정적으로 구현).
- 색상/폰트 크기/간격은 [frontend/src/theme/theme.ts](frontend/src/theme/theme.ts) 토큰만 사용하고 하드코딩하지 않는다. **시니어 UI 규칙**: 폰트 20pt 이상, 터치 타겟 56dp 이상(`theme.MIN_TOUCH_TARGET`).
- 화면은 `src/screens/{common,senior,guardian}/`로 나뉘며 전체 포팅 완료 상태다 — 화면별 상세 현황은 frontend/AGENTS.md 표를 참고.

## 협업 규칙 요약

- 브랜치: `feature/frontend-*`, `feature/backend-*`, `fix/*`, `chore/*`. `main`에 직접 커밋하지 않고 PR로만 반영.
- 커밋: Conventional Commits, scope에 `frontend`/`backend` 명시 권장 (예: `feat(backend): ...`).
- 프론트엔드/백엔드가 섞인 PR은 가능하면 분리한다. API 스펙 변경처럼 분리 불가능한 경우 PR 설명에 `Breaking: API 변경`을 명시하고 양쪽 담당자를 리뷰어로 지정한다.
- 백엔드 보안 필수 규칙(비밀번호 해시 노출 금지, `.env` 하드코딩 금지, IDOR 방지, `camera_access_grant.expires_at` 체크, JWT role 클레임 검증, raw SQL 파라미터 바인딩)은 [backend/claude-security-guidance.md](backend/claude-security-guidance.md)를 인증/권한 코드 작성 전 반드시 확인한다.

## 커뮤니케이션 규칙
- 작업 완료 보고, 판단 근거 설명 등 모든 응답은 한국어로 작성한다.
