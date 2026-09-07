# VideoTensor ↔ frontend 조립 설명서

> **이 저장소에 `VideoTensor/`는 없다.** 원본 프로토타입 앱은 병합 전 저장소인
> `2026-silvervision-main/VideoTensor/`에 있으며(용량이 크고 `.gitignore` 대상),
> 이 문서는 나중에 포즈 로직을 다시 포팅·동기화할 때의 기준으로 복사해 둔 것이다.
> 아래 "파일 대응표"의 `VideoTensor` 경로는 그 폴더 기준으로 읽으면 된다.
>
> 2026-09-06 병합 시점에는 `src/pose/`를 수정 없이 그대로 가져왔으므로 양쪽이
> 일치한다. 이후 어느 한쪽만 고쳤다면 아래 동기화 체크리스트를 따른다.

## 관계

`VideoTensor`는 카메라 기반 포즈 매칭/낙상감지 로직의 **원본/프로토타입** 앱이다. 여기서 실기기로 튜닝하고 검증한 로직을 사람이 직접 `frontend`(제품 앱)로 옮겨 심는다 — 자동 동기화나 공유 패키지가 아니라 **수동 포팅**이다. `frontend` 쪽 코드 주석에도 "VideoTensor/src/app/index.tsx 이식" 같은 표현이 남아있는 이유가 이것이다.

즉 로직이 바뀌면:
- **VideoTensor에서 먼저 실기기로 튜닝/검증** → 그 다음 frontend로 포팅. (또는 이번처럼 데이터/스펙 변경이 frontend에서 먼저 일어났다면, 이 문서를 보고 VideoTensor에도 동일하게 반영.)
- 두 앱은 완전히 독립된 Expo 프로젝트라 npm 패키지나 심볼릭 링크로 공유하지 않는다. 파일을 그대로 복사한 뒤 각 앱의 import 별칭/화면 구조에 맞게 손을 본다.

이 문서는 누군가 VideoTensor만 따로 떼어 작업하고 다시 리포에 합쳤을 때, 그 변경을 frontend/backend에 다시 반영("조립")하는 절차를 남겨두기 위한 것이다.

## 파일 대응표

| VideoTensor | frontend | 비고 |
|---|---|---|
| `src/exercise/*.ts` | `src/pose/exercise/*.ts` | 운동(포즈 시퀀스) 판정 로직. import 별칭만 다름: `@/exercise` ↔ `@/pose/exercise`. |
| `src/fall/*.ts` | `src/pose/fall/*.ts` | 낙상 감지 로직. 이번 작업에서는 건드리지 않음. |
| `src/app/index.tsx` | `src/screens/common/PoseSmokeTestScreen.tsx` + `src/screens/senior/ExerciseProgressScreen.tsx` | VideoTensor는 운동 선택 UI 없는 단일 스모크테스트 화면. frontend는 이 로직을 그대로 옮긴 `PoseSmokeTestScreen`(개발용, 고정 워크아웃)과, 실제 운동 목록/화면 흐름이 붙은 `ExerciseProgressScreen`(제품용, `route.params.workout.poseWorkoutKey`로 워크아웃 결정) 두 곳에 나눠 반영돼 있다. |
| `assets/poses/*.json` | `assets/poses/*.json` | 동일한 포맷·파일명. `extract_pose/convert-pose-json.mjs`(VideoTensor) / `scripts/convert-pose-json.mjs`(frontend)가 각자 `output_new_exercises/`(레포 루트, 두 앱의 공통 조상 폴더)에서 변환해 채운다. |
| `assets/models/fall_cnn_quant.tflite` | `assets/models/fall_cnn_quant.tflite` | 낙상 감지용 tflite 모델. 동일 파일. |
| `android/app/src/main/java/.../PoseDetectorPlugin.kt` | `android/app/src/main/java/.../PoseDetectorPlugin.kt` | MediaPipe 프레임 프로세서 플러그인. 패키지명만 다름: `com.anonymous.VideoTensor` ↔ `com.silvervision.frontend`. |
| `android/app/src/main/java/.../MainApplication.kt` | 〃 | `FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectPose", ...)` 등록 패턴 동일. |
| `extract_pose/extract_pose.py` | (없음) | MediaPipe로 사진→landmark JSON 추출하는 스크립트. `output_new_exercises/`를 만들 때 쓰는 원본 도구라 VideoTensor에만 있다. |

## 알려진 차이점 (의도된 것 — 동기화할 때 착각하지 말 것)

- **워크아웃 선택**: VideoTensor의 `src/app/index.tsx`는 운동 선택 화면이 없는 단일 스모크테스트라 `new ExercisePipeline('stretching')`처럼 워크아웃을 고정해서 쓴다. frontend의 `ExerciseProgressScreen`만 실제로 `workout.poseWorkoutKey`를 받아 운동마다 다른 시퀀스를 돈다(`PoseSmokeTestScreen`도 VideoTensor와 동일하게 `'stretching'` 고정).
- **네비게이션 구조**: VideoTensor는 `expo-router`(파일 기반 라우팅, `src/app/`), frontend는 `@react-navigation/native-stack`(단일 플랫 스택, `src/screens/`). 화면을 포팅할 때 라우팅 코드는 그대로 옮기지 않고 각 구조에 맞게 새로 짠다.
- **android assets**: VideoTensor는 `pose_landmarker_full.task`+`pose_landmarker_lite.task` 둘 다 있고, frontend는 `_lite`만 있다. 이번 작업과 무관한 기존 차이.

## 동기화 체크리스트

VideoTensor와 frontend 중 한쪽만 먼저 바뀐 상태를 발견했을 때(또는 VideoTensor를 독립적으로 작업하고 다시 합쳤을 때) 반영 순서:

1. **`src/exercise` vs `src/pose/exercise`를 파일 단위로 diff**한다 — `constants.ts`(포즈 목록/관절 서브셋/홀드 시간/튜닝값), `reference-poses.ts`, `matcher.ts`, `pipeline.ts`, `index.ts` 순으로 구조가 1:1 대응해야 한다. `geometry.ts`는 지금까지 한 번도 갈라진 적 없음 — 바뀌었다면 실수일 가능성이 높으니 먼저 의도를 확인.
2. **`assets/poses/` 목록을 diff**한다 — 한쪽에만 있는 포즈 파일이 있으면 다른 쪽 `convert-pose-json.mjs`를 다시 돌려 채운다(둘 다 `output_new_exercises/`가 원본이므로 소스만 같으면 두 스크립트의 결과물은 바이트 단위로 같아야 한다).
3. **사용 화면에서 API 시그니처 변경분을 반영**한다 — `ExercisePipeline` 생성자, `matchesPose` 인자, `ExerciseState`의 필드가 바뀌면 `src/app/index.tsx`(VideoTensor), `PoseSmokeTestScreen.tsx`/`ExerciseProgressScreen.tsx`(frontend) 전부 고쳐야 컴파일이 통과한다.
4. **양쪽에서 `npx tsc --noEmit`**을 돌려 타입 정합성을 확인한다.
5. **self-match 검증**(카메라 없이 로직만 확인): 각 포즈를 "그 자신의 라이브 프레임"으로 놓고 `computeJointAngles` → `matchesPose`에 넣으면 반드시 `true`가 나와야 한다. 마스킹 인덱스가 어긋나거나 `minVisibleJoints`가 `activeJoints.length`와 안 맞으면 여기서 걸린다. (이 검증용 스크립트는 커밋해두지 않았으니, 필요하면 `constants.ts`의 `WORKOUT_POSE_SEQUENCES`와 `matcher.ts`의 로직을 그대로 옮긴 1회성 Node 스크립트로 재작성한다.)
6. 마지막으로 **실기기 빌드**(`npm run android`)로 카메라 매칭 체감을 확인한다 — 타입체크/self-match는 로직 정합성만 보장할 뿐, 실제 튜닝값(`ANGLE_TOLERANCE_DEG`/`MIN_VISIBILITY`/`GRACE_RATIO`)이 적당한지는 실기기에서만 판단 가능하다.
