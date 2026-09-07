// ============================================================
// 카메라 프리뷰 위에 landmark를 그릴 때 쓰는 화면 좌표 변환.
//
// 카메라 캡처 프레임은 3:4 비율로 고정인데 실제 화면(컨테이너)은 기기마다 비율이
// 다르므로, letterbox/crop(cover-fit)으로 어긋난 만큼 offset을 보정해야 한다.
// 전면 카메라는 프리뷰가 좌우 반전(셀피 미러)되어 보이는데, 네이티브가 돌려주는
// landmark 좌표는 반전되지 않은 원본 센서 기준이라 그대로 쓰면 반대쪽에 찍힌다.
//
// PoseDot(라이브 스켈레톤 점)과 PoseGuideSilhouette(목표 자세 가이드)가 서로 다른
// 공식을 쓰면 두 레이어가 어긋나므로, 이 파일 하나로 모아서 둘 다 재사용한다.
// ============================================================

export type Layout = { width: number; height: number };

const FRAME_ASPECT_RATIO = 3 / 4;

export function mapNormalizedToScreen(
  x: number,
  y: number,
  layout: Layout,
  mirror: boolean,
): { x: number; y: number } {
  'worklet';
  const containerAspect = layout.width / layout.height;

  let displayW: number;
  let displayH: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > FRAME_ASPECT_RATIO) {
    displayW = layout.width;
    displayH = layout.width / FRAME_ASPECT_RATIO;
    offsetY = (displayH - layout.height) / 2;
  } else {
    displayH = layout.height;
    displayW = layout.height * FRAME_ASPECT_RATIO;
    offsetX = (displayW - layout.width) / 2;
  }

  const nx = mirror ? 1 - x : x;
  return { x: nx * displayW - offsetX, y: y * displayH - offsetY };
}
