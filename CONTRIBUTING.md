# Contributing to SilverVision

이 저장소는 **모노레포**로 운영됩니다 — `frontend/`(Expo/React Native 앱)와 `backend/`(API 서버) 두 하위 프로젝트를 한 저장소에서 함께 관리합니다.

이 문서는 **두 영역을 아우르는 공통 협업 규칙만** 다룹니다. 코드 스타일, 로컬 개발 환경 세팅 등 폴더별 세부 컨벤션은 각 폴더의 CONTRIBUTING.md를 따르세요.

- 프론트엔드 세부 규칙: `frontend/CONTRIBUTING.md` (아직 없음 — 작성 전까지는 이 문서와 [frontend/AGENTS.md](frontend/AGENTS.md)를 참고)
- 백엔드 세부 규칙: `backend/CONTRIBUTING.md` (아직 없음 — `backend/` 폴더 자체가 초기 세팅 전)

## 브랜치 전략

GitHub Flow를 기본으로 합니다 — 단일 `main` 브랜치를 기준으로 기능 브랜치를 만들고, PR로 리뷰 후 병합합니다. `main`에 직접 커밋하지 않습니다.

모노레포 특성상 브랜치 이름에 영역 접두사를 붙여 어디를 다루는 브랜치인지 바로 알 수 있게 합니다.

| 브랜치 패턴 | 용도 |
|---|---|
| `feature/frontend-*` | 프론트엔드 기능 추가 |
| `feature/backend-*` | 백엔드 기능 추가 |
| `fix/*` | 버그 수정 (특정 영역이면 `fix/frontend-*` / `fix/backend-*`도 가능) |
| `chore/*` | 설정, 문서, 의존성 정리 등 |

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 따릅니다. scope에 `frontend` 또는 `backend`를 명시하는 것을 권장합니다.

```
feat(frontend): 보호자 알림 상세 화면 추가
fix(backend): 운동 세션 저장 시 타임존 오류 수정
chore: 루트 .gitignore 정리
```

두 영역에 걸치지 않는 순수 저장소 레벨 변경(문서, CI 설정 등)은 scope를 생략해도 됩니다.

## PR 규칙

- 프론트엔드와 백엔드 변경이 섞인 PR은 **가능하면 분리**해서 올립니다. 리뷰어가 한 영역만 보고 판단하기 어려워지기 때문입니다.
- API 스펙(요청/응답 포맷) 변경처럼 두 영역에 동시에 영향을 주는 변경은 분리가 어렵습니다. 이런 PR은 다음을 지킵니다:
  - PR 설명 맨 위에 `Breaking: API 변경`처럼 눈에 띄는 문구(또는 라벨)를 명시한다.
  - 무엇이 어떻게 바뀌는지(엔드포인트, 요청/응답 필드) 표나 목록으로 정리한다.
  - 프론트엔드 담당자와 백엔드 담당자 **둘 다** 리뷰어로 지정한다.

## 이슈 라벨

새 이슈를 만들 때 아래 라벨 중 해당하는 것을 붙입니다 (복수 선택 가능).

| 라벨 | 용도 |
|---|---|
| `frontend` | Expo/React Native 앱 관련 |
| `backend` | API/DB 서버 관련 |
| `ai-model` | 포즈 추정·운동 분류 등 AI 모델 관련 |
| `api-integration` | 프론트-백엔드 연동, API 계약 관련 |
| `bug` | 버그 리포트 |
| `docs` | 문서 추가/수정 |
