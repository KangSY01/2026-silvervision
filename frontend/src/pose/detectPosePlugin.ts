// ============================================================
// detectPose 네이티브 프레임 프로세서 플러그인(MediaPipe PoseLandmarker) 지연 싱글턴
//
// initFrameProcessorPlugin은 JSI 동기 호출이라, 그 안에서 PoseLandmarker(모델 로딩 +
// GPU delegate 초기화)가 만들어지는 동안 JS 스레드가 통째로 멈춘다. 그래서:
//  - 이 함수를 모듈 최상단에서 "호출"하지 않는다 — 앱 시작이 그만큼 지연된다(정의만 둔다).
//  - 첫 호출 때 한 번만 만들고 이후엔 캐시를 돌려준다 — PoseDetectorPlugin에 close()가
//    없어, 화면 진입마다 새로 만들면 GPU 리소스가 계속 쌓인다.
// 호출은 화면이 마운트·전환된 뒤(useEffect 안)에서만 할 것 — 렌더 중 호출 금지.
// ============================================================
import { VisionCameraProxy, type FrameProcessorPlugin } from 'react-native-vision-camera';

let cachedPlugin: FrameProcessorPlugin | undefined;

export function getDetectPosePlugin(): FrameProcessorPlugin | undefined {
  if (cachedPlugin == null) {
    cachedPlugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {});
    // 미등록(prebuild 누락 등)이면 undefined — 캐시하지 않고 다음 호출에서 재시도한다.
    // 화면은 "카메라 준비 중…"에 머물게 되므로 원인을 알 수 있게 경고를 남긴다.
    if (cachedPlugin == null) {
      console.warn('[detectPose] 프레임 프로세서 플러그인을 초기화하지 못했습니다(prebuild/네이티브 등록 확인).');
    }
  }
  return cachedPlugin;
}
