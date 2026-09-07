// ============================================================
// 실루엣 이미지 안 엉덩이/어깨 픽셀 좌표 — PoseGuideSilhouette가 라이브 엉덩이/어깨
// 위치에 맞춰 실루엣을 실시간으로 배치·스케일할 때 쓰는 기준값.
//
// assets/pose-silhouettes/anchors.json은 scripts/convert-silhouette-anchors.mjs로
// output_new_exercises의 2D landmarks(px/py)에서 뽑아낸 것 — 같은 원본 사진에서 나온
// 값이라 assets/pose-silhouettes/*.png와 픽셀 좌표계가 그대로 일치한다.
// ============================================================
import anchors from '@/assets/pose-silhouettes/anchors.json';

import { type PoseName } from './constants';

export type SilhouetteAnchor = {
  hipPx: { x: number; y: number };
  shoulderWidthPx: number;
  imageWidth: number;
  imageHeight: number;
};

export const SILHOUETTE_ANCHORS = anchors satisfies Record<PoseName, SilhouetteAnchor>;
