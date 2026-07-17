# CONTRIBUTING.md — 실버비전 백엔드 (backend)

3인 소규모 팀 기준으로 최대한 가볍게 운영할 수 있는 협업 규칙이다. 팀에서 합의되지 않은
부분은 초안이므로, 진행하면서 맞지 않으면 자유롭게 수정한다. `frontend/CONTRIBUTING.md`와
동일한 양식을 따른다.

## 1. 브랜치 전략 (GitHub Flow 기반)

소규모 팀이므로 별도의 `develop` 브랜치 없이 단순화한 구조를 사용한다.

- `main`: 항상 배포/데모 가능한 상태 유지. **직접 push 지양**, PR을 통해서만 반영
- `feature/*`: 신규 기능/API 작업 — 예: `feature/backend-serializers`, `feature/backend-auth`
- `fix/*`: 버그 수정 — 예: `fix/backend-jwt-expiry`
- `chore/*`: 설정, 의존성, 문서 등 — 예: `chore/backend-agents-md`

**작업 흐름**
1. `main`에서 최신 상태로 `git pull`
2. `feature/{작업명}` 브랜치 생성
3. 작업 및 커밋
4. `main`으로 PR 생성 → 리뷰 → 머지 (Squash merge 권장)
5. 머지 후 로컬 브랜치 삭제

## 2. 커밋 컨벤션 (Conventional Commits)

```
<type>(<scope>): <subject>
```

| type | 설명 |
|---|---|
| feat | 새 모델/API/기능 |
| fix | 버그 수정 |
| refactor | 동작 변화 없는 코드 개선 |
| style | 포맷팅 등 (로직 변경 없음) |
| docs | 문서 수정 (AGENTS.md, DB_SCHEMA.md 등) |
| test | 테스트 코드 |
| chore | 설정, 의존성, 마이그레이션 정리 |

예시:
```
feat(backend): senior/guardian 계정 모델 구현
fix(backend): JWT 토큰 만료 시간 설정 오류 수정
docs(backend): DB_SCHEMA.md에 ranking_snapshot 추가
```

- scope는 영역 단위로 자유롭게 (auth, models, serializers, views, emergency 등)
- 커밋은 작업 단위로 작게 나누는 것을 권장하며, 모델 변경 시 관련 마이그레이션 파일을
  같은 커밋에 포함한다

## 3. PR 규칙

**PR 템플릿 (제목/본문에 포함)**
- 변경 사항 요약
- 관련 이슈 (`Closes #12`)
- 체크리스트:
  - [ ] `python manage.py check` 통과
  - [ ] `python manage.py makemigrations --check`로 누락된 마이그레이션 없는지 확인
  - [ ] 새/변경된 모델은 `migrate`까지 로컬에서 확인 완료
  - [ ] `.env`, `venv/` 등 민감/불필요 파일이 커밋에 포함되지 않았는지 확인
  - [ ] security-guidance 플러그인 경고가 있었다면 확인 및 조치 여부 기재

- 최소 1인 리뷰 후 머지 (본인 제외 팀원 중 1명)
- API 응답 스키마(요청/응답 포맷)를 변경하는 PR은 프론트엔드 담당자에게도 리뷰 요청

## 4. 코드 리뷰 체크리스트

- [ ] 비밀번호는 반드시 해싱(`set_password`/`make_password`) 후 저장했는가, 평문이 로그나
      응답에 노출되지 않는가
- [ ] `.env`의 값(SECRET_KEY, DB 접속 정보 등)이 코드에 하드코딩되지 않았는가
- [ ] 시니어/보호자 데이터 접근 시 `guardian_senior_map` 기반 권한 확인이 있는가
      (다른 사용자의 데이터에 접근 가능한 IDOR 취약점 여부)
- [ ] `backend/AGENTS.md`의 "AI 모델 경계"를 넘어서는 코드(자세 추정/분류 로직 등)가
      섞여 들어오지 않았는가
- [ ] DB 스키마 변경 시 `backend/DB_SCHEMA.md`도 함께 갱신했는가
- [ ] Django ORM 대신 raw SQL을 쓴 경우 파라미터 바인딩을 사용했는가

## 5. 개발 환경 세팅

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\Activate.ps1
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

- `.env` 파일은 `.env.example`을 참고해 각자 로컬에 생성하고 **커밋하지 않는다**
  (`.gitignore`에 이미 등록됨)
- MySQL은 로컬에 설치 후 `DB_SCHEMA.md` 기준으로 데이터베이스/계정을 만들어 `.env`에 연결
  정보를 채운다
- 패키지를 새로 설치했다면 `pip freeze > requirements.txt`로 갱신하고 커밋에 포함한다
- 서버 실행:
  ```bash
  python manage.py migrate
  python manage.py runserver
  ```

## 6. 이슈 관리

- GitHub Issues 사용
- 라벨 예시: `backend`, `bug`, `enhancement`, `api-integration`, `security`
- 작업 시작 전 이슈를 만들고, PR에서 `Closes #이슈번호`로 연결

## 7. 팀 커뮤니케이션 규칙

- API 응답 스키마 변경 등 **프론트엔드 담당자에게 영향을 주는 변경**은 작업 전 반드시
  사전 협의
- DB 스키마(테이블/컬럼) 변경은 `backend/DB_SCHEMA.md`를 먼저 갱신하고 진행
- AI 모델 담당자가 제공하는 값(관절 각도 편차, 낙상 감지 이벤트 등)의 포맷이 확정되지
  않았다면, 임의로 가정해서 API를 만들지 말고 먼저 확인
- 막히는 부분은 각자 해결하려 오래 붙잡지 말고, 이슈에 남기거나 공유 후 진행