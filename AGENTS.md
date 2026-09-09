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
- **AI 모델(BlazePose 기반 포즈 추정, 동작 분류기 등)은 별도 담당 영역이며, 이 레포의 `frontend/`·`backend/` 어디에도 새로 구현하지 않는다.** 이 영역은 별도 프로토타입 앱 `VideoTensor`(이 저장소 밖, 병합 전 저장소 `2026-silvervision-main/VideoTensor/`에 있음)에서 개발·튜닝되며, 실기기로 검증된 판정 로직(모델 학습·추론 자체는 제외)만 사람이 직접 `frontend/src/pose/`로 포팅하는 절차가 이미 확립돼 있다(`frontend/docs/ASSEMBLY.md` 참고). 이 절차를 벗어난 AI 관련 코드나 모델 파일을 `frontend/`·`backend/`에 추가해 달라는 요청을 받으면, 범위 밖임을 알리고 사용자에게 확인을 구할 것.

## 프론트-백엔드 계약(contract) 확인

API 연동 작업을 할 때는:

1. 먼저 `backend/AGENTS.md` 또는 API 문서(있다면)에서 요청/응답 스펙을 확인한다.
2. 스펙이 없거나 불명확하면 **임의로 형식을 가정해서 구현하지 말고** 사용자에게 확인을 요청한다 (엔드포인트 경로, 요청 바디, 응답 필드명, 에러 포맷 등).

## 현재 진행 상태

_마지막 갱신: 2026-09-06 (비전 갈래 ↔ 백엔드 갈래 병합) — 이 절이 오래됐다고 의심되면 하위 문서 대신 코드(`backend/api/urls.py`, `frontend/src/screens/`, 테스트 실행 결과)로 먼저 교차검증할 것._

- **프론트엔드**: 시니어 화면 9개(공통 Entry/Login + `AbilityHistoryScreen` 포함) + 보호자 화면 9개(총 18개 제품 화면) 및 네비게이션 전체 포팅 완료, **18개 화면 전체 실제 API 연동 완료**(공통 클라이언트 `src/api/client.ts`, `EntryScreen`은 조회 대상 없는 진입 화면). 그 외 개발 전용 `PoseSmokeTestScreen`(카메라 파이프라인 단독 확인, `EntryScreen`의 `__DEV__` 링크로 진입) 1개. **카메라 기반 운동 자세 매칭·낙상 감지도 연결 완료** — `src/pose/{exercise,fall}`이 온디바이스로 판정하고, 그 결과가 운동 세션(`completion_rate`)·응급 이벤트(`POST /emergency/`)로 백엔드에 저장된다(frontend/AGENTS.md 9장). 네이티브 모듈을 쓰므로 **Expo Go가 아니라 개발 빌드(`npx expo run:android`)가 필요**하다.
  - 아직 임시값으로 남은 지점: `PoseFeedback.deviation`(관절별 편차)과 `accuracy_avg` — `matcher.ts`의 `matchesPose()`가 boolean만 반환해 각도 편차를 노출하지 않는 것이 공통 원인이며, 현재 `accuracy_avg`는 `completion_rate`와 같은 값이다(`// TODO(vision)` 주석). `AlertDetailScreen`의 응급 상세 타임라인(`TIMELINE`)도 목업 배열이다.
- **백엔드**: Django 세팅 완료(MySQL, JWT/CORS), DB 모델 13개 테이블 + 마이그레이션 `0001`~`0009` 적용 완료, 시리얼라이저 13개 테이블 전 영역 작성 완료. 커스텀 JWT 인증(`RoleBasedJWTAuthentication`)·권한 클래스·API 뷰·URL 라우팅(`config/urls.py`에 `/api/v1/` 연결)까지 **인증/계정/운동/기록/응급/게임화 전 섹션 구현 완료**(엔드포인트 총 24개, `api/tests.py` 87건 전체 통과). 미구현은 비밀번호 변경/재설정, 매핑 등록 전 시니어 검색 API뿐이다. 자세한 내용은 [backend/AGENTS.md](backend/AGENTS.md) 5장 참고.
  - `0007`은 `Exercise.pose_workout_key` 추가 — 운동 행과 프론트 포즈 시퀀스를 잇는 태그이며, 판정 로직은 여전히 프론트 소유다(`backend/DB_SCHEMA.md` 참고).
  - `0008`은 `EmergencyNotification.channel` default `'fcm'`→`'sms'` — `.../notify/`가 `api/sms.py`로 연동 보호자에게 솔라피(Solapi) SMS를 실제 발송한다(`SOLAPI_*` 미설정 시 발송 스킵, 실패해도 알림 이력은 남김).
  - `0009`는 `EmergencyNotification` unique_together `(event, guardian)` — `.../notify/` 재호출/동시 요청 시 중복 알림 row·중복 SMS 방지. 뷰도 "이미 notified면 재발송 안 함"으로 멱등 처리한다.
