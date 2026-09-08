import AsyncStorage from '@react-native-async-storage/async-storage';

import { PoseWorkoutKey } from '../types';

// Expo는 클라이언트 번들(JS)에 인라인될 환경 변수에 EXPO_PUBLIC_ 접두사를 요구한다
// (그 외 변수는 Metro가 번들에 넣지 않아 런타임에 process.env에서 undefined가 된다).
// .env의 EXPO_PUBLIC_API_BASE_URL을 읽고, 없으면 로컬 개발 기본값으로 폴백한다.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export type UserRole = 'senior' | 'guardian';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: number;
}

/** backend/api/views.py의 _issue_tokens() 응답 형태 (senior/guardian 로그인 공통). */
export interface LoginTokenResponse {
  access: string;
  refresh: string;
}

/** backend/api/serializers.py의 SeniorProfileSerializer 응답 형태 (GET /senior/{id}/). */
export interface SeniorProfileResponse {
  login_id: string;
  name: string;
  phone: string;
  address: string;
  diseases: string;
  medication: string;
  mobility_level: 'independent' | 'partial_assist' | 'full_assist';
  barcode_code: string;
  /** 날짜별 상한을 적용한 **전체 누적** 열매 수. 오늘치가 아니다. */
  fruit_count: number;
  /** 오늘 완료한 운동 수. 자정이 지나면 0부터 다시 센다. */
  today_completed: number;
  /** 하루 목표 운동 수(백엔드 FRUIT_DAILY_CAP). */
  daily_goal: number;
}

/** backend/api/serializers.py의 GuardianProfileSerializer 응답 형태 (GET /guardian/{id}/). */
export interface GuardianProfileResponse {
  login_id: string;
  name: string;
  phone: string;
  address: string;
}

/**
 * backend/api/serializers.py의 RankingSnapshotSerializer 응답 형태
 * (GET /senior/{id}/ranking/ 응답의 national/regional 각 값). 배치 프로세스가 미리
 * 계산해 둔 순위 스냅샷 한 건이며, score는 "이번 달 완료 세션 수", rank_position은
 * 표준 경쟁 순위다. rank_position은 모델에서 NULL 허용이라 number | null.
 */
export interface RankingSnapshotResponse {
  snapshot_id: number;
  senior: number;
  score: number;
  snapshot_date: string; // 'YYYY-MM-DD'
  rank_scope: 'national' | 'regional';
  rank_position: number | null;
}

/**
 * backend/api/views.py의 SeniorRankingView 응답 형태 (GET /senior/{id}/ranking/).
 * 완료한 세션이 없는 신규 시니어는 해당 scope가 null이다("순위 없음"은 정상 상태, 200).
 */
export interface SeniorRankingResponse {
  national: RankingSnapshotResponse | null;
  regional: RankingSnapshotResponse | null;
}

/**
 * backend/api/serializers.py의 ExerciseSerializer 응답 형태 (GET /exercises/,
 * /exercises/{id}/). reference_angles는 온디바이스 AI가 관절 각도 편차를 계산할 때
 * 쓰는 기준값이라 이 화면들에서 아직 소비하지 않아 구체 형태를 좁히지 않는다.
 */
export interface ExerciseResponse {
  exercise_id: number;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  guide_image_url: string;
  silhouette_url: string;
  reference_angles: Record<string, unknown>;
  // 카메라 판정 시퀀스 선택 태그. src/pose/exercise의 WORKOUT_POSE_SEQUENCES
  // 키와 같은 집합이며, /admin/에서 값을 안 넣은 운동은 null로 내려온다
  // (ExerciseSelectScreen이 목록에서 제외).
  pose_workout_key: PoseWorkoutKey | null;
}

/**
 * backend/api/serializers.py의 ExerciseMissionSerializer 응답 형태
 * (POST /senior/{id}/missions/). ExerciseProgressScreen이 세션 시작 전 미션을
 * 자동 생성할 때 mission_id만 소비하지만, 시리얼라이저 전체 형태를 남겨둔다.
 */
export interface ExerciseMissionResponse {
  mission_id: number;
  senior: number;
  exercise: {
    exercise_id: number;
    name: string;
    category: string;
    difficulty: ExerciseResponse['difficulty'];
    guide_image_url: string;
  };
  scheduled_at: string;
  status: 'pending' | 'completed' | 'skipped';
}

/**
 * backend/api/serializers.py의 ExerciseSessionSerializer 응답 형태
 * (POST /senior/{id}/sessions/, PATCH /senior/{id}/sessions/{session_id}/).
 * completion_rate/accuracy_avg는 DRF DecimalField라 문자열로 직렬화되며,
 * 세션 시작 직후에는 아직 값이 없어 null이다.
 */
export interface ExerciseSessionResponse {
  session_id: number;
  mission: number;
  senior: number;
  exercise: number;
  completion_rate: string | null;
  accuracy_avg: string | null;
  created_at: string;
}

/**
 * PATCH /senior/{id}/sessions/{session_id}/ 응답
 * (backend/api/serializers.py의 ExerciseSessionCompleteSerializer).
 *
 * fruit_awarded는 "이번 완료로 열매가 실제로 늘었는지"다. 하루 상한
 * (FRUIT_DAILY_CAP=6)에 걸렸거나 같은 세션을 다시 PATCH하면 false가 되며,
 * 화면이 "+1 수확!"을 무조건 띄우지 않도록 하는 데 쓴다. fruit_count는 지급
 * 여부와 무관하게 갱신된 현재 총량이다.
 */
export interface ExerciseSessionCompleteResponse {
  session_id: number;
  completion_rate: string | null;
  accuracy_avg: string | null;
  fruit_count: number;
  fruit_awarded: boolean;
  /** 이번 완료를 포함한 오늘의 운동 수. */
  today_completed: number;
  /** 하루 목표 운동 수. */
  daily_goal: number;
}

/**
 * backend/api/serializers.py의 ActivityLogSerializer 응답 형태
 * (GET /senior/{id}/activity-log/). 기기가 보낸 화면 On/Off·터치·가속도 등
 * 활동 이벤트 한 건. activity_type은 백엔드가 choices로 잠그지 않은 자유
 * 문자열이라(센서 추가에 따라 늘 수 있음) string으로 둔다. logged_at은
 * auto_now_add(서버 기록 시각).
 */
export interface ActivityLogResponse {
  log_id: number;
  senior: number;
  activity_type: string;
  logged_at: string;
}

/**
 * backend/api/serializers.py의 PhysicalAbilityLogSerializer 응답 형태
 * (GET /senior/{id}/ability-log/ 목록 항목, POST upsert 응답). 장기 신체 능력
 * 추적의 일별 기록 한 건이며 하루 최대 1건이다(unique_together (senior,
 * logged_date), GET은 logged_date 오름차순).
 *
 * rom_score(관절 가동범위)/completion_score(동작 완성도)는 DRF DecimalField라
 * 문자열('70.00')로 직렬화된다. 두 값은 온디바이스 AI(자세 추정)가 계산해
 * 보낸 결과를 백엔드가 저장만 한다(AI 모델 경계) - 아직 비전 파이프라인이
 * 붙지 않아 실제로는 기록이 없을 수 있고, 그 경우 GET은 빈 배열을 준다.
 * POST(기록 생성)는 비전 연동 시점의 작업이라 프론트에서 아직 호출하지 않는다
 * (AbilityHistoryScreen 주석 참고).
 */
export interface PhysicalAbilityLogResponse {
  log_id: number;
  senior: number;
  rom_score: string;
  completion_score: string;
  logged_date: string; // 'YYYY-MM-DD'
}

/**
 * backend/api/serializers.py의 MappedSeniorSerializer 형태
 * (GuardianSeniorMapSerializer.senior에 중첩). 보호자 쪽에서 피보호자를 식별할
 * 최소 정보만 담기며, 질환·복용약 등 민감 정보는 빠져 있다.
 */
export interface MappedSeniorResponse {
  senior_id: number;
  login_id: string;
  name: string;
  phone: string;
  mobility_level: SeniorProfileResponse['mobility_level'];
}

/**
 * backend/api/serializers.py의 GuardianSeniorMapSerializer 응답 형태
 * (GET /guardian/{id}/seniors/ 목록의 각 항목, POST /guardian/{id}/seniors/ 생성 응답).
 */
export interface GuardianSeniorMapResponse {
  map_id: number;
  guardian: number;
  senior: MappedSeniorResponse;
  registered_via: 'id_search' | 'barcode';
  created_at: string;
}

export type EmergencyStatus =
  | 'detected'
  | 'first_check'
  | 'false_alarm'
  | 'notified'
  | 'resolved';

export type EmergencyEventType = 'fall' | 'inactivity' | 'sos';

/**
 * backend/api/serializers.py의 EmergencyEventSerializer 응답 형태
 * (GET /emergency/ 목록 항목, PATCH /emergency/{id}/ 응답). senior는 PK(정수)만
 * 담기며 이름은 nested되지 않는다 - 이름이 필요하면 GET /guardian/{id}/seniors/의
 * senior 요약과 senior_id로 맞춘다.
 */
export interface EmergencyEventResponse {
  event_id: number;
  senior: number;
  event_type: EmergencyEventType;
  detection_source: string;
  status: EmergencyStatus;
  created_at: string;
}

/** backend/api/serializers.py의 EmergencyNotificationSerializer (상세 nested). */
export interface EmergencyNotificationResponse {
  notification_id: number;
  event: number;
  guardian: number;
  channel: string;
  sent_at: string;
}

/** backend/api/serializers.py의 CameraAccessGrantSerializer (상세 nested). */
export interface CameraAccessGrantResponse {
  grant_id: number;
  event: number;
  granted_at: string;
  expires_at: string;
}

/**
 * backend/api/serializers.py의 EmergencyEventDetailSerializer 응답 형태
 * (GET /emergency/{id}/). 목록 필드에 알림 발송 이력·카메라 접근 권한 이력이
 * nested로 더해진다.
 */
export interface EmergencyEventDetailResponse extends EmergencyEventResponse {
  notifications: EmergencyNotificationResponse[];
  camera_grants: CameraAccessGrantResponse[];
}

const STORAGE_KEYS = {
  accessToken: 'silvervision.auth.accessToken',
  refreshToken: 'silvervision.auth.refreshToken',
  role: 'silvervision.auth.role',
  userId: 'silvervision.auth.userId',
} as const;

// JWT payload(가운데 세그먼트)만 디코딩해 role/user_id 클레임을 읽는다. 서명 검증은
// 서버가 이미 하므로(로그인 응답으로 막 발급받은 토큰), 여기서는 값을 꺼내 쓰기
// 위한 디코딩일 뿐 신뢰 경계 역할은 하지 않는다. atob/Buffer가 RN 런타임마다
// 있다고 보장할 수 없어 외부 라이브러리 없이 직접 base64 디코딩한다. role/user_id/
// exp/iat/jti 등 클레임이 전부 ASCII라 멀티바이트 UTF-8 처리는 하지 않는다.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

interface AccessTokenClaims {
  role: UserRole;
  user_id: number;
}

function decodeAccessTokenClaims(accessToken: string): AccessTokenClaims {
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) {
    throw new Error('유효하지 않은 토큰 형식입니다.');
  }
  return JSON.parse(decodeBase64Url(payloadSegment)) as AccessTokenClaims;
}

/** 로그인 응답(access/refresh)에서 role/user_id를 추출해 저장한다. */
export async function persistSessionFromLoginResponse(
  tokens: LoginTokenResponse,
): Promise<AuthSession> {
  const claims = decodeAccessTokenClaims(tokens.access);
  const session: AuthSession = {
    accessToken: tokens.access,
    refreshToken: tokens.refresh,
    role: claims.role,
    userId: claims.user_id,
  };
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, session.accessToken],
    [STORAGE_KEYS.refreshToken, session.refreshToken],
    [STORAGE_KEYS.role, session.role],
    [STORAGE_KEYS.userId, String(session.userId)],
  ]);
  return session;
}

export async function getSession(): Promise<AuthSession | null> {
  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.role,
    STORAGE_KEYS.userId,
  ]);
  const values = Object.fromEntries(entries);
  const accessToken = values[STORAGE_KEYS.accessToken];
  const refreshToken = values[STORAGE_KEYS.refreshToken];
  const role = values[STORAGE_KEYS.role];
  const userId = values[STORAGE_KEYS.userId];
  if (!accessToken || !refreshToken || (role !== 'senior' && role !== 'guardian') || !userId) {
    return null;
  }
  return { accessToken, refreshToken, role, userId: Number(userId) };
}

/**
 * 재발급받은 access token만 덮어쓴다. ROTATE_REFRESH_TOKENS를 켜지 않았으므로
 * refresh token·role·userId는 그대로 두고 access token 하나만 교체하면 된다.
 */
async function saveAccessToken(accessToken: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

/**
 * 로그아웃. 저장된 refresh token을 백엔드 `POST /auth/logout/`로 blacklist해
 * 서버에서 실제로 무효화한 뒤(응급 시 카메라/GPS를 여는 서비스라 탈취된
 * refresh token이 로그아웃 후에도 access token을 찍어내면 위험 — backend
 * AGENTS.md 5장) 로컬 세션을 지운다. 엔드포인트는 `AllowAny`이고 무효 토큰도
 * 205로 멱등 통과하므로 인증 없이(`auth: false`) 호출한다. 서버 요청이
 * 실패해도(네트워크 등) 로컬 세션 삭제는 그대로 진행한다.
 */
export async function logout(): Promise<void> {
  try {
    const session = await getSession();
    if (session) {
      await request('POST', '/auth/logout/', { refresh: session.refreshToken }, { auth: false });
    }
  } catch {
    // 서버 blacklist 실패는 무시하고 로컬 세션만 확실히 지운다.
  } finally {
    await clearSession();
  }
}

/**
 * DRF 에러 응답을 그대로 감싼다. payload는 `{ detail: string }`(권한/인증 오류,
 * 커스텀 400 등) 또는 `{ field: string[] }`(ModelSerializer 검증 실패) 형태다 -
 * 백엔드 전체에 공통 에러 스키마가 없어 형태를 더 좁게 강제하지 않는다. status 0은
 * 네트워크 자체가 실패해 서버 응답을 받지 못한 경우다.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: Record<string, unknown> | null;

  constructor(status: number, payload: Record<string, unknown> | null) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : undefined;
    super(detail ?? `요청이 실패했습니다 (status ${status}).`);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * ApiError에서 화면에 그대로 보여줄 수 있는 메시지를 뽑는다. 백엔드가 401/커스텀
 * 400에서 { detail: string }을 주는 경우(로그인 자격 증명 오류, 네트워크 실패 등)만
 * 다루고, 필드별 검증 에러({ field: string[] } 형태)는 화면마다 의미가 달라 여기서
 * 일반화하지 않는다 - 그 경우는 fallback 메시지로 대체한다.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = error.payload?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return fallback;
}

/**
 * 회원가입(POST /auth/senior/register/·/auth/guardian/register/) 전용 에러 메시지.
 * 이 두 엔드포인트만 ModelSerializer 필드 검증 실패를 `{ login_id: [...] }` 형태로
 * 주므로(공통 `{ detail }` 스키마 밖) `getApiErrorMessage`로는 잡히지 않아 여기서
 * 다룬다. `login_id` unique 위반 메시지는 DRF 기본 영문이라 그대로 노출하지 않고
 * 프론트에서 한국어 고정 문구로 안내한다. 비밀번호 규칙 위반은 두 화면 모두 전송
 * 전에 클라이언트에서 먼저 검사하므로(시니어=숫자 4자리, 보호자=8자+영문숫자)
 * 여기서 따로 다루지 않고 fallback으로 넘긴다.
 */
export function getRegisterErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.payload) {
    const loginIdErrors = error.payload.login_id;
    if (Array.isArray(loginIdErrors) && loginIdErrors.length > 0) {
      return '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.';
    }
  }
  return getApiErrorMessage(error, '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.');
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  /**
   * 저장된 access token이 있으면 Authorization 헤더에 자동 첨부할지 여부.
   * 기본 true. 로그인/회원가입처럼 인증이 필요 없는 요청에는 false로 넘긴다 -
   * 이 값이 false인 요청에서 401이 와도 "세션 만료"가 아니라 자격 증명 자체가
   * 틀린 것이므로 재발급 시도 없이 즉시 실패시키고 세션도 지우지 않는다.
   * auth:true 요청의 401은 refresh 1회 시도 후 실패 시에만 세션을 삭제한다
   * (아래 request() 참고).
   */
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * 진행 중인 재발급 Promise. 화면 여러 곳이 동시에 요청을 보내다 한꺼번에 401을
 * 받으면 재발급도 그만큼 중복 발사되는데, 같은 Promise를 공유해 1회로 묶는다.
 * (두 번째 이후 호출은 첫 번째 결과를 그대로 기다린다.)
 */
let inFlightRefresh: Promise<string | null> | null = null;

/**
 * refresh token으로 access token을 재발급받아 저장하고 새 access token을 반환한다.
 * 재발급이 불가능하면(refresh token 없음·만료·위조) null을 반환하며, 세션 삭제는
 * 호출자인 request()가 판단한다.
 *
 * request()를 쓰지 않고 fetch를 직접 호출한다 - request()를 타면 이 요청의 401이
 * 다시 재발급을 부르는 무한 재귀가 된다.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      const session = await getSession();
      if (!session) return null;

      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: session.refreshToken }),
      });
      if (!response.ok) return null;

      // ROTATE_REFRESH_TOKENS를 켜지 않았으므로 응답은 { access }뿐이다.
      const data = (await response.json()) as { access?: string };
      if (!data.access) return null;

      await saveAccessToken(data.access);
      return data.access;
    } catch {
      // 네트워크 실패도 재발급 실패로 취급한다. 세션을 지울지는 호출자가 정한다.
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, signal } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const session = await getSession();
    if (session) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  // 같은 요청을 재발급 후 한 번 더 보내야 하므로 전송 자체를 내부 함수로 묶는다.
  const send = async (accessToken?: string): Promise<Response> => {
    const finalHeaders = accessToken
      ? { ...headers, Authorization: `Bearer ${accessToken}` }
      : headers;
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch {
      throw new ApiError(0, {
        detail: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
      });
    }
  };

  let response = await send();

  // access token 수명은 짧다(SIMPLE_JWT 미설정 시 기본 5분). 만료된 토큰으로
  // 401이 오면 refresh token으로 한 번 재발급받아 같은 요청을 재시도한다.
  // 재발급까지 실패해야 비로소 세션을 삭제한다 - 예전에는 첫 401에서 곧바로
  // 삭제해 5분마다 강제 로그아웃되는 것처럼 보였다.
  //
  // 재시도는 정확히 1회다. 새로 받은 토큰으로도 401이면 만료가 아니라 권한
  // 문제이므로 더 시도해봐야 같은 결과다.
  if (auth && response.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      response = await send(renewed);
    }
    if (response.status === 401) {
      await clearSession();
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data as Record<string, unknown> | null);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
