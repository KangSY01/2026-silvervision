# AGENTS.md (저장소 루트)

Claude Code가 이 저장소(`silvervision`) **루트**에서 작업을 시작할 때 가장 먼저 참고하는 문서입니다.

## 최우선 지침

이 레포는 `frontend/`, `backend/` 두 하위 프로젝트로 구성된 **모노레포**입니다.

- **프론트엔드** 작업(화면, 네비게이션, 상태관리 등) 시 → 반드시 먼저 [frontend/AGENTS.md](frontend/AGENTS.md)를 확인하라.
- **백엔드** 작업(API, DB 등) 시 → 반드시 먼저 [backend/AGENTS.md](backend/AGENTS.md)를 확인하라. DB 테이블 설계는 [backend/DB_SCHEMA.md](backend/DB_SCHEMA.md), 보안 필수 규칙은 [backend/claude-security-guidance.md](backend/claude-security-guidance.md)에 정리되어 있다.

이 루트 문서는 두 영역을 아우르는 저장소 레벨 맥락만 다루며, 폴더별 세부 규칙(코드 컨벤션, 기술 스택, 화면 구현 현황 등)은 다루지 않는다.

## 프로젝트 개요

실버비전(SilverVision)은 시니어(피보호자)의 운동을 돕고, 보호자가 그 활동과 안전 상태를 원격으로 조회할 수 있게 하는 서비스다. 스마트 카메라 기반 AI 관절 분석으로 운동 동작을 코칭하고, 낙상 등 이상 상황을 감지해 보호자에게 알리는 것을 목표로 한다.

## 두 영역 간 경계

- `frontend/` — UI, 네비게이션, (목업/로컬) 상태관리만 다룬다. 실제 데이터 영속화나 인증 로직은 없다.
- `backend/` — API 서버, DB만 다룬다. **AI가 이미 계산한 결과값(운동 달성률·관절 편차·응급 이벤트 등)을 저장·조회하는 API만 제공하며, 추론 로직 자체는 구현하지 않는다** (자세한 경계는 [backend/AGENTS.md](backend/AGENTS.md#3-ai-모델-경계) 참고).
- **AI 모델(BlazePose 기반 포즈 추정, 동작 분류기 등)은 별도 담당 영역이며, 이 레포의 `frontend/`·`backend/` 어디에도 구현하지 않는다.** AI 관련 코드나 모델 파일을 이 두 폴더 안에 추가해 달라는 요청을 받으면, 범위 밖임을 알리고 사용자에게 확인을 구할 것.

## 프론트-백엔드 계약(contract) 확인

API 연동 작업을 할 때는:

1. 먼저 `backend/AGENTS.md` 또는 API 문서(있다면)에서 요청/응답 스펙을 확인한다.
2. 스펙이 없거나 불명확하면 **임의로 형식을 가정해서 구현하지 말고** 사용자에게 확인을 요청한다 (엔드포인트 경로, 요청 바디, 응답 필드명, 에러 포맷 등).

## 현재 진행 상태

- **프론트엔드**: 시니어 화면 8개 + 보호자 화면 9개(총 17개) 및 네비게이션 전체 포팅 완료. 백엔드 API 연동은 화면 단위로 진행 중이며 현재 3개 화면(시니어 로그인, 보호자 로그인, 운동 선택)이 실제 API를 쓰고, 나머지는 `AppStateContext` 목업(mock)이다. 공통 API 클라이언트는 `src/api/client.ts`. 자세한 내용은 [frontend/AGENTS.md](frontend/AGENTS.md) 참고.
- **백엔드**: Django 세팅 완료(MySQL, JWT/CORS), DB 모델 13개 테이블 + 마이그레이션 `0001`~`0006` 적용 완료, 시리얼라이저 13개 테이블 전 영역 작성 완료. 커스텀 JWT 인증(`RoleBasedJWTAuthentication`)·권한 클래스·API 뷰·URL 라우팅(`config/urls.py`에 `/api/v1/` 연결)까지 인증/계정/운동/기록/응급 5개 섹션 구현 완료. 미구현은 게임화 섹션 전체, `physical_ability_log`/`activity_log` API, 토큰 refresh·로그아웃. 자세한 내용은 [backend/AGENTS.md](backend/AGENTS.md) 5장 참고.
