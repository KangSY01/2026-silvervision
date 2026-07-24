import AsyncStorage from '@react-native-async-storage/async-storage';

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
  fruit_count: number;
}

/** backend/api/serializers.py의 GuardianProfileSerializer 응답 형태 (GET /guardian/{id}/). */
export interface GuardianProfileResponse {
  login_id: string;
  name: string;
  phone: string;
  address: string;
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

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
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

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  /**
   * 저장된 access token이 있으면 Authorization 헤더에 자동 첨부할지 여부.
   * 기본 true. 로그인/회원가입처럼 인증이 필요 없는 요청에는 false로 넘긴다 -
   * 이 값이 false인 요청에서 401이 와도 "세션 만료"가 아니라 자격 증명 자체가
   * 틀린 것이므로 세션을 지우지 않는다(아래 request() 참고).
   */
  auth?: boolean;
  signal?: AbortSignal;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, { detail: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.' });
  }

  // 단순 401 처리: 백엔드에 refresh 엔드포인트가 아직 없어(simplejwt의
  // RefreshToken은 로그인 시 최초 발급에만 쓰이고, 이를 access token으로
  // 교환하는 라우팅은 backend/api/urls.py에 없다) 재시도할 방법 자체가 없다.
  // 그래서 refresh-and-retry 대신 즉시 로그아웃 상태(토큰 삭제)로 되돌리는
  // 단순한 방식을 택했다 - 시연 임박 상황에서 존재하지 않는 엔드포인트를
  // 가정한 재시도 로직보다 확실하게 동작하는 쪽이 낫다고 판단했다. 실제 화면
  // 전환(로그인 화면으로 이동)은 이 모듈이 네비게이션을 모르므로 호출부(다음
  // 배치)에서 ApiError.status === 401을 잡아 처리한다.
  if (auth && response.status === 401) {
    await clearSession();
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
