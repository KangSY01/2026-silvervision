// ============================================================
// fall_common.py 이식 — 설정 상수
//
// ⚠️ 이 값들은 학습 파이프라인(tfliteProject/fall_common.py)과 반드시 일치해야 한다.
//    바뀌면 학습 데이터와 앱 추론이 어긋나 모델이 처음 보는 입력을 받게 된다.
//    원본: tfliteProject/fall_common.py (lines 14~59)
// ============================================================

export const FPS = 10;
export const DT_MS = 100; // 100ms 격자 (1000 / FPS)
export const DT_S = DT_MS / 1000.0; // 0.1s — 속도는 '초당'으로 계산

// ⚠️ 모델별로 다르다. model34 = 20(2.0초), model_v3 = 30(3.0초).
// 현재 앱 애셋(assets/models/fall_cnn_quant.tflite)은 model_v3 → 입력 (30, 53).
// 모델을 바꾸면 model_info.json 의 preprocess_config.window_frames 와 일치시킬 것.
export const WINDOW_FRAMES = 30; // 3.0초 윈도우 (model_v3)
export const STRIDE_FRAMES = 3; // 0.3초 stride

export const TARGET_ASPECT = 3.0 / 4.0; // 앱 카메라 화각(세로). 4:3 센서를 세로로 든 형태

// 사용할 관절 (MediaPipe Pose 33개 중 9개)
export const JOINTS = [0, 11, 12, 23, 24, 25, 26, 27, 28] as const;
export const JOINT_LABELS = [
  'nose',
  'l_shoulder',
  'r_shoulder',
  'l_hip',
  'r_hip',
  'l_knee',
  'r_knee',
  'l_ankle',
  'r_ankle',
] as const;

// JOINTS 배열 안에서의 위치 (원본 MediaPipe 인덱스가 아님)
export const J_NOSE = 0;
export const J_LSH = 1;
export const J_RSH = 2;
export const J_LHIP = 3;
export const J_RHIP = 4;

export const MIN_VISIBILITY = 0.3;
export const MAX_GAP_FRAMES = 2; // 이보다 긴 결측은 유효(detected)로 보지 않음
export const EPS = 1e-6;

// feature_names() 와 동일 순서 (tfliteProject/fall_common.py:45-56)
export function featureNames(): string[] {
  const names: string[] = [];
  for (const lab of JOINT_LABELS) names.push(`${lab}_x`, `${lab}_y`);
  for (const lab of JOINT_LABELS) names.push(`${lab}_vx`, `${lab}_vy`);
  for (const lab of JOINT_LABELS) names.push(`${lab}_vis`);
  names.push(
    'torso_sin',
    'torso_cos',
    'torso_angvel',
    'hip_y_frame',
    'hip_vy_frame',
    'bbox_aspect',
    'torso_len',
    'detected',
  );
  return names;
}

export const N_FEATURES = featureNames().length; // 53

// ============================================================
// 판정(경보) 파라미터 — 앱 전용 (학습과 무관, 실기기 튜닝 대상)
// 근거(model_v3): Coords_Dataset/test 체계적 홀드아웃에서 임계값 0.95·연속1 기준
//   재현율 0.968, 시간당 오경보 7.31회 (README 11장, 모델 선택 임계값).
//   오경보를 더 줄이려면 임계값↑/연속횟수↑ (재현율과 트레이드오프).
// ============================================================
export const FALL_THRESHOLD = 0.95; // 이 확률 이상을 '낙상 윈도우'로 본다 (model_v3 선택 임계값)
export const CONSECUTIVE_WINDOWS = 2; // 연속 N회 충족 시 낙상 확정 (오경보 억제)
export const RECOVER_WINDOWS = 3; // fallen 상태에서 연속 N회 저확률이면 idle 복귀(히스테리시스)
