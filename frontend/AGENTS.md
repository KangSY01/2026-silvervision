# AGENTS.md

## 1. 프로젝트 개요

실버비전(SilverVision) — 시니어(피보호자)의 운동을 돕고, 보호자가 활동을 조회할 수 있는 Expo(React Native) 앱.
시니어가 직접 사용하는 화면이 많으므로 모든 UI는 "시니어 UI 규칙"(6장 참고)을 우선한다.

## 2. Expo 버전 안내

Expo HAS CHANGED — 코드를 작성하기 전에 반드시 정확한 버전별 문서를 확인할 것.
현재 버전 기준 문서: https://docs.expo.dev/versions/v54.0.0/

## 3. 기술 스택

- Expo ~54.0.35 / React Native 0.81.5 / React 19.1.0 / TypeScript ~5.9.2 (strict)
- `lucide-react-native` + `react-native-svg` — 아이콘 (ai-studio-reference의 `lucide-react` 아이콘을 동일 이름으로 대체)
- `expo-linear-gradient` — 그라디언트 배경/버튼 (Tailwind의 `bg-gradient-*` 재현용)
- 웹 프리뷰용: `react-dom`, `react-native-web`, `@expo/metro-runtime` — `npx expo start --web`으로 크롬에서 확인 가능 (네이티브 전용 API를 쓰는 화면은 웹에서 다르게 보일 수 있음)
- `@react-navigation/native` + `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context` — 네비게이션 도입 완료 (8장 참고)
- `@react-native-async-storage/async-storage` — JWT access/refresh 토큰 저장 (`src/api/client.ts`)
- 백엔드 통신은 `fetch` 기반 자체 클라이언트(`src/api/client.ts`) — 별도 HTTP 라이브러리 미도입
- 아직 미도입: `moti`(애니메이션, 필요 시 도입 검토)

## 4. 프로젝트 구조

```
frontend/
  App.tsx                        # 실제 앱 진입점: SafeAreaProvider → AppStateProvider →
                                  # NavigationContainer → Stack.Navigator 구조
  src/
    screens/
      common/                    # EntryScreen, LoginScreen 등 역할 공통 화면
      senior/                    # 시니어(피보호자) 전용 화면
      guardian/                  # 보호자 전용 화면
    navigation/types.ts          # RootStackParamList — 화면별 params 타입 정의 (8장 참고)
    api/client.ts                # 공통 API 클라이언트 (fetch 래퍼, JWT 저장/첨부, ApiError, 응답 타입)
    context/AppStateContext.tsx  # userProfile, fruitsCollected 등 전역 상태 공유 (8장 참고)
    components/TabScreenLayout.tsx  # 홈/운동하기/개인정보 공통 헤더 + 하단 탭바 레이아웃
    theme/theme.ts                # colors / fontSizes / fontWeights / spacing / radius / MIN_TOUCH_TARGET 토큰
    types/index.ts                # UserProfile, ActivityLevel 등 공용 타입
```

화면 컴포넌트에서 색상·폰트 크기·간격을 하드코딩하지 말고 항상 `src/theme/theme.ts` 토큰을 사용한다.

## 5. 디자인 소스 및 화면 구현 현황

**디자인 소스**: Figma MCP 기반 디자인 작업은 월 6회 호출 한도 문제로 비효율적이라 중단했다. 현재 디자인 소스는 Google AI Studio로 생성한 웹 React 프로토타입이며, 이 레포와 형제 폴더 위치인 `../ai-studio-reference`에 있다. **이 폴더는 참고용 소스일 뿐 실행 대상이 아니다** — 여기서 컴포넌트를 그대로 복사하지 않는다.

**작업 방식**: `ai-studio-reference`의 컴포넌트(웹 React + Tailwind)를 참고해서 React Native로 "포팅"한다. 그대로 복사가 아니라 번역 작업이다.
- `div`/`span`/`button` → `View`/`Text`/`Pressable`
- `className` + Tailwind → `StyleSheet` (theme 토큰 사용)
- `lucide-react` → `lucide-react-native` (동일 아이콘명)
- `motion/react` 애니메이션 → 우선 제외하고 정적으로 구현 (추후 필요 시 `moti`로 대체 검토)

**하단 탭바 구조**: 시니어 앱 하단 탭바는 평면 탭 3개 — 홈(`Home`) / 운동하기(`Dumbbell`) / 개인정보(`User`). 활성 탭은 primary(`#2E7D32`), 비활성 탭은 회색 계열(`colors.inactiveIcon`)로 표시한다. **중앙 플로팅 마이크 버튼은 없다** — 현재 참고 소스(`ai-studio-reference`)의 `HomeView`에도 실제로 구현되어 있지 않다(`onOpenVoiceAssistant` prop이 선언만 되고 미사용). 음성 인식 기능은 추후 별도 설계가 필요한 미확정 상태이므로, 확정된 디자인 없이 임의로 만들지 않는다.

**화면 포팅 현황**:

| 화면 | 참고 소스 | 상태 |
|---|---|---|
| EntryScreen (진입화면) | SplashView.tsx | 완료 |
| LoginScreen (로그인) | LoginView.tsx | 완료 |
| SignupScreen (회원가입) | SignupView.tsx | 완료 |
| SeniorHomeScreen (시니어 홈) | HomeView.tsx | 완료 |
| ExerciseSelectScreen (운동 선택) | WorkoutListView.tsx | 완료 |
| ExerciseProgressScreen (운동 진행) | WorkoutActiveView.tsx | 완료 |
| ExerciseFeedbackScreen (운동 피드백) | FeedbackView.tsx | 완료 |
| ProfileScreen (개인정보) | ProfileView.tsx | 완료 |
| VoiceAssistantModal (음성 어시스턴트) | - | 포팅 완료, 미마운트 (설계 미확정) |
| GuardianLoginScreen (보호자 로그인) | GuardianLoginView.tsx | 완료 |
| GuardianSignupScreen (보호자 회원가입) | GuardianSignupView.tsx | 완료 |
| GuardianHomeScreen (보호자 홈 · 홈 탭 대시보드) | GuardianHomeDashboardView.tsx | 완료 |
| GuardianActivityListScreen (활동 기록 탭 · 피보호자 리스트) | GuardianHomeView.tsx | 완료 |
| AddSeniorScreen (피보호자 추가 등록) | AddSeniorView.tsx | 완료 |
| SeniorDetailScreen (피보호자 상세) | SeniorDetailView.tsx | 완료 |
| GuardianProfileScreen (보호자 개인정보) | GuardianProfileView.tsx | 완료 |
| AlertHistoryScreen (긴급 알림 기록) | AlertHistoryView.tsx | 완료 |
| AlertDetailScreen (알림 상세) | AlertDetailView.tsx | 완료 |
| react-navigation 연결 | - | 완료 |

## 6. 코드 컨벤션

**시니어 UI 규칙 (필수)**: 폰트 크기 20pt 이상, 터치 타겟(버튼 등 인터랙션 요소) 56dp 이상 (`theme.MIN_TOUCH_TARGET`).

**`ai-studio-reference` 코드 포팅 시 규칙**:
- `hover` 상태는 제거하고, `Pressable`의 `pressed` 상태 스타일로 대체한다.
- `motion/react` 애니메이션은 우선 제외하고 정적으로 구현한다.
- 네비게이션이 아직 연결되지 않은 화면의 `onPress` 핸들러는 `console.log` + `// TODO: react-navigation 연결 후 ...` 주석으로 스텁 처리한다.
- 원본 레이아웃 · 색상 · 문구는 최대한 그대로 유지하되, 색상/폰트/간격 값은 반드시 `theme.ts` 토큰으로 옮겨서 사용한다(하드코딩 금지). 필요한 토큰이 없으면 `theme.ts`에 먼저 추가한다.

## 7. 다음 단계

- 시니어 화면 8종 + 보호자 화면 9종 포팅 및 네비게이션(탭 전환, 뒤로가기 스택, 화면 간 실제 연결) 전체 완료됨
- **백엔드 API 연동 — 17개 화면 전체 완료**:
  - 공통 클라이언트 `src/api/client.ts` 구현 완료: `apiClient.{get,post,patch,delete}`, JWT access/refresh를 `AsyncStorage`에 저장·자동 첨부, `ApiError`/`getApiErrorMessage`(+ register 필드 에러 전용 `getRegisterErrorMessage`), 인증 요청 401 시 세션 클리어(refresh 재시도 없음 — 백엔드에 재발급 엔드포인트 없음). 응답 타입 인터페이스도 이 파일에 모으고 각 인터페이스 주석에 대응 백엔드 시리얼라이저를 명시.
  - 연동 완료: `LoginScreen`(시니어 로그인+프로필 조회), `GuardianLoginScreen`(보호자 로그인+프로필 조회), `SignupScreen`·`GuardianSignupScreen`(`POST /auth/{role}/register/` → 같은 자격 증명으로 `POST /auth/{role}/login/` 이어붙여 가입 즉시 로그인·홈 진입 — 아래 항목), `ExerciseSelectScreen`(`GET /exercises/`), `SeniorHomeScreen`(포커스마다 `GET /senior/{id}/` fruit_count + `GET /senior/{id}/ranking/`), `ExerciseProgressScreen`·`ExerciseFeedbackScreen`(운동 세션: 진입 시 미션 자동 생성→세션 시작, 결과 화면에서 완료 PATCH + `feedback/` POST), `GuardianHomeScreen`(포커스마다 `GET /guardian/{id}/seniors/` — 등록 인원수 + 이름 칩), `AddSeniorScreen`(`POST /guardian/{id}/seniors/` — 조회+등록 동시), `AlertHistoryScreen`·`AlertDetailScreen`(`GET /emergency/` 목록·`GET /emergency/{id}/` 상세·`PATCH` 상태 변경), `GuardianActivityListScreen`(포커스마다 피보호자별 대시보드 집계 — 아래 항목), `SeniorDetailScreen`(포커스마다 `GET /senior/{id}/` + `.../sessions/` + `GET /exercises/` + `GET /emergency/` 병렬, `DELETE /guardian/{gid}/seniors/{sid}/` 연동 해제 — 아래 항목), `GuardianProfileScreen`(포커스마다 `GET /guardian/{id}/` + `.../seniors/` 병렬, 필드별 인라인 수정 `PATCH /guardian/{id}/`, `DELETE .../seniors/{sid}/` — 아래 항목), `ProfileScreen`(시니어 개인정보: 포커스마다 `GET /senior/{id}/`, 전체 편집 모드 토글로 6개 필드 일괄 `PATCH /senior/{id}/`, `barcode_code` 표시 — 아래 항목).

  **→ 17개 화면 전체 API 연동 완료**(`EntryScreen`은 조회 대상이 없는 진입 화면). `VoiceAssistantModal`만 설계 미확정으로 미마운트. `AppStateContext`에는 로그인·프로필 PATCH로 채워지는 `userProfile`/`guardianProfile`만 남고 목업 상수는 전부 제거됐다.
  - **회원가입 연동 흐름**(`SignupScreen`·`GuardianSignupScreen`): register 엔드포인트는 토큰 없이 프로필(`Senior/GuardianProfileSerializer`)만 주므로, 성공 시 폼에 입력한 같은 자격 증명으로 곧바로 `POST /auth/{role}/login/`을 호출해 `persistSessionFromLoginResponse`(로그인 배치와 동일)로 세션을 저장하고 홈으로 `navigate`한다(가입 즉시 홈 진입하는 기존 목업 UX 유지). 프로필은 register 응답을 그대로 써 `AppStateContext`(`userProfile`/`guardianProfile`)에 채운다(추가 GET 없음). `GuardianSignupScreen`의 `guardianProfile` 프리필·평문 pw 상태는 목업 잔재라 제거하고 데모 기본값으로 대체. **비밀번호 검증은 전송 전 클라이언트에서 먼저 한다** — 시니어는 `number-pad`+`maxLength=4`에 더해 `/^\d{4}$/` 재검사(붙여넣기 대비, 문구는 로그인 화면 "숫자 4자리"와 통일), 보호자는 `8자 이상 && 영문 && 숫자`(서버 `min_length` 위반 메시지가 DRF 영문 기본값이라 노출하지 않고 한국어로 안내). 서버 에러는 `client.ts`의 `getRegisterErrorMessage`로 처리 — `{ login_id: [...] }`(중복 아이디, 영문 기본 메시지) 는 "이미 사용 중인 아이디입니다"로 고정, 그 외는 `getApiErrorMessage` fallback.
  - **운동 세션 연동 흐름**: `ExerciseProgressScreen` mount → `POST /senior/{id}/missions/`(scheduled_at=now, `senior`는 `ExerciseMissionCreateSerializer`가 필수라 본인 id를 body에 실음) → `POST /senior/{id}/sessions/`(`{mission}`, session_id를 ref에 보관). 타이머 완료/건너뛰기 → `ExerciseFeedback`로 `sessionId`+`completionRate`(타이머 경과율) 전달. `ExerciseFeedbackScreen` mount → `PATCH .../sessions/{id}/`(`completion_rate`=경과율, `accuracy_avg`=화면 표시 점수 87) + `POST .../feedback/`(고정 placeholder 배열). **`accuracy_avg`·`completion_rate`·`deviation`은 전부 `// TODO(vision)` 주석이 달린 임시값** — 비전 파이프라인 연결 지점이다. X 버튼 이탈은 `goBack()`만 하고 세션을 미완료(completion_rate=null)로 남긴다(백엔드가 완료로 집계하지 않음).
  - **보호자 피보호자 등록 흐름**: 백엔드에 검색 전용 엔드포인트가 없어 `POST /guardian/{id}/seniors/`가 조회+등록을 한 번에 처리한다(`registered_via: id_search | barcode` + `login_id | barcode_code`). `AddSeniorScreen`은 "검색" 버튼이 곧바로 POST를 호출하고, 404(일치 없음)/409(이미 등록됨)를 각각 다른 문구로 구분한다. 바코드 스캔은 실제 카메라(expo-camera 등) 미도입 — 레이저 애니메이션은 연출로 유지하고 스캐너 모달에서 바코드 코드를 직접 입력받아 `barcode_code`로 보낸다.
  - **`GuardianActivityListScreen` 대시보드 집계**(포커스마다 재조회, `AppStateContext` 미사용·화면 로컬 상태): `GET /guardian/{id}/seniors/` + `GET /emergency/`를 병렬로 부르고, 이어서 피보호자별로 `GET /senior/{seniorId}/sessions/` + `GET /senior/{seniorId}/activity-log/?since=<오늘 0시 ISO>`를 `Promise.all`로 병렬 호출한다(인원 2~5명 규모라 순차는 지연이 인원수만큼 곱해지고, 병렬 호출 부담은 무시 가능). 실패는 GuardianHome/AlertHistory와 동일하게 화면 전체 error 상태(all-or-nothing).
    - **이번 주 운동 횟수** = `completion_rate !== null`(백엔드가 완료 PATCH 시에만 채움)이고 `created_at`이 이번 주(월요일 0시~현재, 기기 로컬 시각) 안인 세션 수.
    - **상태 우선순위**(카드 색·문구, 위에서부터): ① `fall_suspected` — `emergency.ts`의 `hasActiveFallAlert`(해당 senior의 `event_type === 'fall'` && 미종결(`false_alarm`/`resolved` 아님) 이벤트 존재). ② `not_connected_today` — 오늘 0시 이후 활동 로그 0건 && 오늘 완료 세션 0건. ③ `workout_done_today` — 오늘 완료 세션 ≥ 1. ④ `connected_today`(기본). 낙상은 유일한 생명·안전 신호라 하위 신호에 가려지면 안 되고, "미접속"(오늘 상태 확인 불가)은 무활동 감지 서비스의 핵심 우려라 "운동 안 함"보다 앞선다. 오늘 완료 세션이 있으면 그 자체를 "오늘 접속"의 증거로 인정해(기기 활동 로깅 미연동 환경 대비) `not_connected` 오판을 막는다.
    - **벨 아이콘 빨간 점**(`hasCriticalAlert`) = `emergency.ts`의 `isNotifiedAlert`로 `GET /emergency/` 결과에 `status === 'notified'`(보호자에게 전송됐고 아직 미종결) 이벤트가 하나라도 있는지. seniors 배열이 아니라 실제 응급 목록 기준.
  - **`SeniorDetailScreen` 연동**(포커스마다 재조회, 화면 로컬 상태 — `AppStateContext` 미사용): `GET /senior/{id}/`(방금 매핑된 보호자 GET 허용된 프로필) + `.../sessions/` + `GET /exercises/`(세션 목록엔 운동 이름이 nested 안 돼 `exercise_id→name` 맵을 별도 구성) + `GET /emergency/`(응답을 `event.senior === seniorId`로 한 번 더 좁힘)를 `Promise.all` 병렬. route param `seniorId`는 문자열이라 `Number()`로 변환.
    - **"주간 활동 시간(분)" 차트 → "주간 운동 횟수"로 대체**: `ExerciseSession`에 소요시간 필드 자체가 없다(`completion_rate`/`accuracy_avg`만). 지난 배치(ExerciseSelect의 `duration` 제거)와 같은 원칙으로 없는 데이터를 지어내지 않고, 실제로 있는 값인 **날짜별 완료 세션 수**를 막대 높이로 쓰고 탭/헤더 라벨을 "주간 운동 횟수"·"최근 7일간 완료한 운동"·"주간 누적: N회"로 바꿨다. 완료 세션이 0건인 주는 차트 대신 안내 문구.
    - **"관절 동작 완성도(%)" 차트**: 최근 7일 날짜별 `accuracy_avg` 평균(값이 있는 세션만 — 완료돼도 `accuracy_avg`가 null이면 그 날은 데이터 없음으로 점 생략). 목표선 80%는 피보호자 데이터가 아닌 고정 기준선이라 유지. 값 있는 날이 0이면 안내 문구.
    - **"오늘 수행 운동 내역"**: 오늘 0시 이후 `created_at` + `completion_rate` 채워진 세션, `exercise_id`→이름 매핑, 시각은 `created_at` 그대로(완료 전용 타임스탬프 없음 — 세션 배치와 일관).
    - **"거동 안전 및 이상 감지 기록"**: 이 senior 소속 emergency만, `emergency.ts`의 `EMERGENCY_TYPE_LABELS`/`EMERGENCY_STATUS_LABELS`/`isAlertClosed`/`formatEmergencyTimestamp` 재사용. 종결(`resolved`) 이벤트는 카드/뱃지를 중립 톤으로.
    - **"보호 등급"**: `mobility_level`→한글 라벨. `LoginScreen`에만 있던 `MOBILITY_LEVEL_TO_ACTIVITY_LEVEL`을 `src/labels.ts`(신규, `types/index.ts`·`api/client.ts` 인근의 공용 라벨 모듈)로 옮겨 시니어·보호자 화면이 공유. 같은 매핑을 화면마다 중복 정의하지 않기 위함.
    - **"기기 연동 해제"**: `Alert.alert` 확인 다이얼로그 → `DELETE /guardian/{gid}/seniors/{sid}/`(204) → 성공 시 `GuardianHome`으로 `navigate`. 실패는 `Alert.alert`로 표시.
  - **`GuardianProfileScreen` 연동**(포커스마다 재조회, 화면 로컬 상태): `GET /guardian/{id}/` + `.../seniors/` 병렬. 표시는 로컬 `profile` 상태 기준이고, `AppStateContext.guardianProfile`은 **PATCH 성공 시에만** 변경 필드를 merge해 갱신한다(GuardianHome의 인사말 등에 반영 — 매 포커스마다 context를 덮어써 불필요한 리렌더를 만들지 않기 위함).
    - **비밀번호 행**: 변경 API가 범위 밖(토큰 refresh/로그아웃 배치에서 확정)이라 행은 남기되(비밀번호가 설정돼 있음을 보임) 우측을 "준비 중" 표기 — "로그인 아이디 / 수정 불가" 행과 같은 비편집 행 패턴이라 카드가 어색해지지 않는다. 행을 통째로 숨기면 "비밀번호가 없는 앱"처럼 읽혀 안전 서비스에 부적절.
    - **인라인 수정(name/phone/address)**: "수정" 탭 → 그 행이 `TextInput` + 저장/취소로 바뀐다(한 번에 한 필드, `editingField` 상태). 저장 → `PATCH /guardian/{id}/ { [field]: value }`(변경 없으면 요청 생략), 성공 시 로컬 + context 갱신. 모든 인터랙션 요소(수정 링크 히트박스, 입력창, 저장/취소 버튼)는 `GUARDIAN_MIN_TOUCH_TARGET`(44) 이상. `login_id`는 UI에서 수정 불가로 유지(백엔드 시리얼라이저는 허용하지만 프론트가 보내지 않음). 실패는 `Alert.alert`.
    - **피보호자 목록·연동 해제**: `.../seniors/` 결과로 렌더, `avatarInitials`는 `name.slice(-2)`(다른 가디언 화면과 동일). 연동 해제는 SeniorDetailScreen의 `Alert.alert` 확인 → `DELETE` 패턴 재사용, 성공 시 로컬 목록에서 즉시 필터 제거.
    - **`AppStateContext.seniors` 제거**: 이 화면이 마지막 소비처였고 연동 후 아무도 안 써서 `seniors`/`setSeniors`/`DEFAULT_SENIORS` 및 `types/index.ts`의 `Senior` 인터페이스까지 삭제(죽은 목업 코드 정리).
  - **`ProfileScreen` 연동**(시니어 본인 개인정보, 포커스마다 재조회·화면 로컬 상태): `GET /senior/{id}/`. 표시는 로컬 `profile` 상태 기준이고, `AppStateContext.userProfile`은 **PATCH 성공 시에만** 변경 필드를 merge(함수형 업데이트로 `fruitCount`/`pw` 보존 — SeniorHome 인사말·`VoiceAssistantModal`이 읽음).
    - **편집 구조 — 전체 편집 모드 토글 유지**(GuardianProfile의 필드별 인라인 편집과 다름): "정보수정" 하나로 6개 필드(`name`/`phone`/`address`/`diseases`/`medication`/`mobility_level`)를 동시에 편집 모드로 전환하고, 저장 시 6개를 한 번에 `PATCH /senior/{id}/`로 실어 보낸다. 시니어 UI라 작은 인라인 토글을 여러 개 두기보다 큰 "저장" 버튼 하나로 끝내는 편이 자연스럽고, 원본 디자인도 이미 그렇게 설계돼 있어 구조를 유지했다. 헤더에 "취소"를 추가(실수로 편집 모드 진입 시 이탈 경로). 필드별 "수정하기" 링크는 전부 같은 전체 편집 모드를 여는 원본 동작 그대로.
    - **`login_id`**: `SeniorProfileSerializer`가 write 허용하지만 프론트가 PATCH body에 넣지 않고 "(수정 불가)"로 표시(GuardianProfile과 동일 원칙).
    - **`mobility_level`**: `labels.ts`의 양방향 매핑 재사용 — 표시는 `MOBILITY_LEVEL_TO_ACTIVITY_LEVEL`, PATCH 전송은 `ACTIVITY_LEVEL_TO_MOBILITY_LEVEL`(회원가입 배치에서 만든 것).
    - **`name`/`phone`/`address` 비우기 방지**: 백엔드 `CharField`(blank 불가)라 전송 전 클라이언트에서 `trim()` 후 빈 값이면 `Alert.alert`로 막는다. `diseases`/`medication`은 `TextField(blank=True)`라 빈 값 허용.
    - **바코드 표시**: 하단 "안심 바코드" 캡션과 요약 카드 "실버비전 매칭 코드"의 하드코딩(`SV-9982`, `9982-1234-5678-SILVER`)을 실제 `barcode_code`로 교체. 값은 `uuid4().hex.upper()` = 대시 없는 32자리 대문자 hex라, 어르신이 보호자에게 불러주거나 눈으로 대조하기 쉽도록 `formatBarcodeCode()`로 8자리씩 4묶음(`XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`)으로 끊어 표시(원본 목업의 4묶음 표기와 같은 형태). 요약 카드는 라벨/값을 두 줄로 분리해 줄바꿈이 지저분하지 않게 함.
    - **`AppStateContext.alerts` 제거**: `AlertHistory`/`AlertDetail`이 `GET /emergency/`로 연동된 뒤 아무도 안 써서 `alerts`/`setAlerts`/`DEFAULT_ALERTS` 및 `types/index.ts`의 구 `EmergencyEvent` 인터페이스(`type: 'fall' | 'injury'`, 한글 status — `api/client.ts`의 `EmergencyEventResponse`와 별개)까지 삭제. 이로써 `AppStateContext` 목업 상수는 전부 정리됨(`DEFAULT_PROFILE`/`DEFAULT_GUARDIAN`은 로그인 전 플레이스홀더라 유지).
  - `GuardianHomeScreen`의 "정상/확인 필요" 상태 칩은 제거했다 — 그 판정은 응급 이벤트·활동 로그가 필요한데(`AlertHistoryScreen` 연동 배치 예정) 임의 규칙으로 색을 칠하면 허위 안심을 줄 수 있어, 이번엔 등록 피보호자 이름만 나열한다. "최근 알림·활동 피드" 카드도 같은 이유로 안내 문구만 남겼다.
  - **응급 알림 연동**: `src/screens/guardian/emergency.ts`에 status(5종)/event_type(3종) 라벨 Record + 필터 분류 + 전이 판정 + 신호 헬퍼(`isNotifiedAlert`, `hasActiveFallAlert`)를 모았다(`AlertHistory`/`AlertDetail`/`GuardianActivityList` 공용). `EmergencyEventSerializer.senior`가 PK만 주므로 Alert 두 화면은 `GET /guardian/{id}/seniors/`를 함께 불러와 `senior_id → 이름` 맵을 만든다. 목록 필터: `detected/first_check/notified` = "미확인", `false_alarm/resolved` = "확인완료". **`AlertDetailScreen` 액션은 "상황 확인 완료"(→`resolved`) 하나만 실제 동작**한다 — 백엔드 `EMERGENCY_EVENT_TRANSITIONS`(배포·검증 완료, 미변경)상 `notified→false_alarm`("오보 처리")·`resolved→*`("미확인 재지정")가 불가해 두 버튼은 UI에서 제거했다. `notified/false_alarm` 상태만 버튼 노출, `resolved`는 종결 배너, 그 외(`detected/first_check`)는 안내 문구. `TIMELINE`·스켈레톤 리플레이 SVG·"CRITICAL ACCELERATION" 등 상세 분석 시각화는 비전팀 몫이라 목업 유지.
  - 데이터 연동은 전 화면 완료. 남은 API 작업은 백엔드 미구현 항목 대기뿐(비밀번호 변경 → `GuardianProfileScreen` 비밀번호 행, 음성 인식 → `VoiceAssistantModal`). API 스펙은 `backend/AGENTS.md` 5장 표 또는 실제 `backend/api/serializers.py`·`views.py`에서 확인하고, 불명확하면 임의 가정 대신 확인.
  - 백엔드 enum → 화면 표시 라벨 변환은 `Record<enum, label>` 타입으로 만들어 enum 확장 시 컴파일 타임에 누락이 드러나게 한다(`ExerciseSelectScreen`의 `DIFFICULTY_LABELS` 참고).
- 음성 인식 기능 설계 확정 후 `VoiceAssistantModal` 연결

## 8. 네비게이션 및 상태 관리

**화면 흐름**:

```
Entry (진입)
  ├─ Login (로그인, 시니어) ──┐
  │    └─ Signup (회원가입) ─┘
  │                        └─ SeniorHome (시니어 홈) ─┬─ ExerciseSelect (운동 선택)
  │                                                    │     └─ ExerciseProgress (운동 진행)
  │                                                    │           └─ ExerciseFeedback (운동 피드백)
  │                                                    └─ Profile (개인정보)
  │
  └─ GuardianLogin (로그인, 보호자) ──┐
       └─ GuardianSignup (회원가입) ─┘
                                   └─ GuardianHome (보호자 홈) ─┬─ GuardianActivityList (활동 기록) ─┬─ SeniorDetail (피보호자 상세)
                                                                │                                    └─ AddSenior (피보호자 추가)
                                                                └─ GuardianProfile (개인정보)

(GuardianHome / GuardianActivityList 어디서든) 알림벨·전체보기 → AlertHistory (긴급 알림 기록) → AlertDetail (알림 상세)
```

- SeniorHome / ExerciseSelect / Profile 은 `TabScreenLayout` 공통 헤더 + 하단 탭바로 서로 이동 가능 (ExerciseProgress / ExerciseFeedback 은 탭바 밖의 운동 진행 흐름이라 `TabScreenLayout`을 쓰지 않음).
- GuardianHome / GuardianActivityList / GuardianProfile 은 `GuardianTabScreenLayout` 공통 헤더 + 하단 탭바로 서로 이동 가능 (SeniorDetail / AddSenior / AlertHistory / AlertDetail 은 탭바 밖의 뒤로가기 스택 화면이라 `GuardianTabScreenLayout`을 쓰지 않음).
- 전체 네비게이터는 `App.tsx`의 `createNativeStackNavigator<RootStackParamList>()` 하나(`Stack`)이며, 시니어·보호자 화면 전체가 `Stack.Navigator`의 `screenOptions={{ headerShown: false }}` 아래 평면적으로 함께 등록되어 있다(중첩 네비게이터 없음). 즉 각 탭 화면은 실제 탭 네비게이터가 아니라, `TabScreenLayout`/`GuardianTabScreenLayout` 컴포넌트가 하단 탭바 UI만 흉내내며 `navigation.navigate(...)`로 스택 이동을 수행하는 방식이다. `navigate()`는 대상 화면이 이미 스택에 있으면 그 화면으로 pop하고, 없으면 새로 push하므로, 탭을 반복 전환해도 스택이 무한정 쌓이지 않는다(2026-07-16 Playwright로 전체 플로우 검증 완료 — 시니어/보호자 화면끼리 서로 섞이지 않고, 깊은 스택(SeniorDetail, AlertDetail 등)에서도 뒤로가기가 정확한 이전 화면으로 돌아감).

**params 타입**: 화면별 라우트 params는 [src/navigation/types.ts](src/navigation/types.ts)의 `RootStackParamList`에서 관리한다. 새 화면을 추가하거나 params가 필요해지면 이 파일부터 갱신할 것. 두 가지 패턴이 쓰인다:
- 객체 자체를 넘기는 방식 — `ExerciseProgress`/`ExerciseFeedback`처럼 `{ workout: Workout }`을 params로 직접 전달.
- id만 넘기고 화면에서 조회하는 방식 — `SeniorDetail: { seniorId: string }`, `AlertDetail: { eventId: number }`처럼 id만 전달하고, 화면이 그 id로 API를 직접 조회한다(`useFocusEffect`).

두 경우 모두 `useRoute<RouteProp<RootStackParamList, '화면명'>>()`으로 타입을 좁혀서 사용한다.

**전역 상태 (`AppStateContext`)**: [src/context/AppStateContext.tsx](src/context/AppStateContext.tsx)는 `App.tsx`에서 `NavigationContainer` 바깥, `SafeAreaProvider` 안쪽에 `AppStateProvider`로 마운트되어 화면 간 공유가 필요한 상태(`userProfile`, `guardianProfile`)를 보관한다. 화면 컴포넌트에서는 `useAppState()` 훅으로 접근한다(`AppStateProvider` 밖에서 호출하면 에러 발생). API 연동은 전 화면 완료됐고(7장), 대부분의 화면은 `AppStateContext` 대신 화면 로컬 상태(`useFocusEffect`로 포커스마다 재조회)를 쓴다 — `userProfile`/`guardianProfile`은 로그인 시 채워지고 각 프로필 화면(`ProfileScreen`/`GuardianProfileScreen`)의 수정 PATCH 성공 시 변경 필드만 merge되며, `SeniorHome`/`GuardianHome`의 인사말·`VoiceAssistantModal`의 열매 개수처럼 화면 로컬 조회로 덮기 애매한 소비처가 이 둘을 읽는다. 목업 상수(`DEFAULT_SENIORS`/`DEFAULT_ALERTS` 등)는 연동 완료로 전부 제거됐고 `DEFAULT_PROFILE`/`DEFAULT_GUARDIAN`만 로그인 전 플레이스홀더로 남아 있다. 로그인 세션 자체는 `src/api/client.ts`가 `AsyncStorage`로 관리한다. 화면 간 1회성 전달 데이터는 `RootStackParamList` params를 우선 사용한다.
