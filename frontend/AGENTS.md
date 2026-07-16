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
- 백엔드 API 연동으로 목업 데이터(`AppStateContext`의 `DEFAULT_PROFILE`/`DEFAULT_GUARDIAN`/`DEFAULT_SENIORS`/`DEFAULT_ALERTS` 등) 교체
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
- id만 넘기고 화면에서 조회하는 방식 — `SeniorDetail: { seniorId: string }`, `AlertDetail: { alertId: string }`처럼 id만 전달하고, 화면 내부에서 `useAppState()`의 `seniors`/`alerts` 배열을 `find()`로 조회한다(대상이 `AppStateContext`에 이미 존재하는 공유 데이터일 때 이 패턴을 쓴다).

두 경우 모두 `useRoute<RouteProp<RootStackParamList, '화면명'>>()`으로 타입을 좁혀서 사용한다.

**전역 상태 (`AppStateContext`)**: [src/context/AppStateContext.tsx](src/context/AppStateContext.tsx)는 `App.tsx`에서 `NavigationContainer` 바깥, `SafeAreaProvider` 안쪽에 `AppStateProvider`로 마운트되어 화면 간 공유가 필요한 상태(`userProfile`, `guardianProfile`, `seniors`, `alerts`, `fruitsCollected`)를 보관한다. 화면 컴포넌트에서는 `useAppState()` 훅으로 접근한다(`AppStateProvider` 밖에서 호출하면 에러 발생). 현재 값은 백엔드 연동 전 목업(`DEFAULT_PROFILE`/`DEFAULT_GUARDIAN`/`DEFAULT_SENIORS`/`DEFAULT_ALERTS` 등)이며, params로 전달하기엔 여러 화면에서 공유해야 하는 값만 여기 둔다 — 화면 간 1회성 전달 데이터는 `RootStackParamList` params를 우선 사용한다.
