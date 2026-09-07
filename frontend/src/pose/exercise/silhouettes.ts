// ============================================================
// 운동 자세 가이드 실루엣 이미지
//
// frontend/assets/pose-silhouettes/*.png — 배경은 완전 투명, 사람 형태만
// colors.silhouette(#E2E8F0) 색상으로 채워진 RGBA PNG다. 원본은
// output_silhouette_biref(그레이스케일, 배경=검정/사람=흰색, 알파 채널 없음)를
// 그레이스케일 값을 그대로 알파로 사용해 변환한 것 — 화면에서는 이 위에
// Image의 opacity를 추가로 낮춰 반투명 가이드로 보여준다(ExerciseProgressScreen 참고).
// ============================================================
import { type ImageSourcePropType } from 'react-native';

import stretching1 from '@/assets/pose-silhouettes/stretching1.png';
import stretching2 from '@/assets/pose-silhouettes/stretching2.png';
import stretching3 from '@/assets/pose-silhouettes/stretching3.png';
import upper_body1 from '@/assets/pose-silhouettes/upper_body1.png';
import upper_body2 from '@/assets/pose-silhouettes/upper_body2.png';
import upper_body3 from '@/assets/pose-silhouettes/upper_body3.png';
import upper_body4 from '@/assets/pose-silhouettes/upper_body4.png';
import upper_body5 from '@/assets/pose-silhouettes/upper_body5.png';
import knee1 from '@/assets/pose-silhouettes/knee1.png';
import knee2 from '@/assets/pose-silhouettes/knee2.png';
import knee3 from '@/assets/pose-silhouettes/knee3.png';
import balance_pose1 from '@/assets/pose-silhouettes/balance_pose1.png';
import balance_pose2 from '@/assets/pose-silhouettes/balance_pose2.png';
import balance_pose3 from '@/assets/pose-silhouettes/balance_pose3.png';
import balance_pose4 from '@/assets/pose-silhouettes/balance_pose4.png';
import balance_pose5 from '@/assets/pose-silhouettes/balance_pose5.png';

import { type PoseName } from './constants';

export const POSE_SILHOUETTES: Record<PoseName, ImageSourcePropType> = {
  stretching1,
  stretching2,
  stretching3,
  upper_body1,
  upper_body2,
  upper_body3,
  upper_body4,
  upper_body5,
  knee1,
  knee2,
  knee3,
  balance_pose1,
  balance_pose2,
  balance_pose3,
  balance_pose4,
  balance_pose5,
};
