// ============================================================
// 낙상 감지 CNN(assets/models/fall_cnn_quant.tflite) 로더
//
// react-native-fast-tflite의 useTensorflowModel(require(...))는 Image.resolveAssetSource
// 의 uri를 그대로 네이티브 URL(path).readBytes()에 넘긴다. 디버그에서는 Metro가
// http://…/assets/… 로 서빙해 되지만, 릴리즈 빌드에서는 uri가 스킴 없는 Android
// 리소스 이름("models_fall_cnn_quant")이라 MalformedURLException으로 조용히 실패하고
// 화면은 "낙상 감지 준비 중…"에 영원히 머문다(POST /emergency/도 절대 안 나간다).
//
// 그래서 여기서는 expo-asset으로 모델을 먼저 기기 캐시 디렉터리에 내려받아(릴리즈는
// res/raw 리소스 복사, 디버그는 Metro 다운로드) 항상 file:// 실경로를 얻은 뒤
// loadTensorflowModel({ url })로 넘긴다 — fast-tflite는 file:// 는 정상으로 읽는다.
// .task 모델처럼 src/main/assets에 두는 방식은 fast-tflite가 android_asset 경로를
// 못 읽어서 쓸 수 없다.
// ============================================================
import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';
import { loadTensorflowModel, type TensorflowPlugin } from 'react-native-fast-tflite';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FALL_MODEL_MODULE: number = require('@/assets/models/fall_cnn_quant.tflite');

// 로드 결과는 앱 전체에서 1회만 만들어 화면 재진입 시 재다운로드·재생성을 피한다.
let cachedLoad: Promise<TensorflowPlugin & { state: 'loaded' }> | undefined;

async function loadFallModel(): Promise<TensorflowPlugin & { state: 'loaded' }> {
  const asset = await Asset.fromModule(FALL_MODEL_MODULE).downloadAsync();
  if (asset.localUri == null) {
    throw new Error('fall_cnn_quant.tflite: expo-asset이 localUri를 돌려주지 않았습니다.');
  }
  const model = await loadTensorflowModel({ url: asset.localUri }, []);
  return { model, state: 'loaded' };
}

/**
 * 낙상 감지 tflite 모델을 로드해 useTensorflowModel과 같은 형태의 상태로 돌려준다.
 * 실패하면 `state: 'error'`가 되고 원인을 console.error로 남긴다 — 호출부는
 * 이 상태를 사용자에게 보이게 처리해야 한다(조용히 준비 중으로 두지 말 것).
 */
export function useFallModel(): TensorflowPlugin {
  const [state, setState] = useState<TensorflowPlugin>({ model: undefined, state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (cachedLoad == null) {
      cachedLoad = loadFallModel().catch((e) => {
        // 실패한 Promise를 캐시에 남기면 다음 진입에서도 영영 실패하므로 비운다.
        cachedLoad = undefined;
        throw e;
      });
    }
    cachedLoad
      .then((loaded) => {
        if (!cancelled) setState(loaded);
      })
      .catch((e: unknown) => {
        console.error('[fall] 낙상 감지 모델 로드 실패', e);
        if (!cancelled) {
          setState({
            model: undefined,
            state: 'error',
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
