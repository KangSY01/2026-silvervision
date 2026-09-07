const { withAppBuildGradle, withMainApplication, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MEDIAPIPE_DEP = "implementation 'com.google.mediapipe:tasks-vision:0.10.14'";
const FRAME_PROCESSOR_IMPORT = 'import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry';
const FRAME_PROCESSOR_REGISTRATION = [
  '        FrameProcessorPluginRegistry.addFrameProcessorPlugin("detectPose") { proxy, options ->',
  '            PoseDetectorPlugin(proxy, options)',
  '        }',
].join('\n');

// android/app/build.gradle에 MediaPipe 의존성과, .task 모델 파일이 APK 패키징 시
// 압축되지 않도록(noCompress) 하는 설정을 추가한다. 압축되면 PoseLandmarker의
// 네이티브 로딩이 런타임에 실패한다(VideoTensor의 build.gradle에서 확인된 필수 설정).
function withPoseDetectorGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(MEDIAPIPE_DEP)) {
      contents += `\ndependencies {\n    ${MEDIAPIPE_DEP}\n}\n`;
    }

    if (!contents.includes('noCompress "task"') && !contents.includes("noCompress 'task'")) {
      contents += `\nandroid {\n    androidResources {\n        noCompress "task"\n    }\n}\n`;
    }

    config.modResults.contents = contents;
    return config;
  });
}

// MainApplication.kt에 커스텀 vision-camera Frame Processor Plugin("detectPose")을 등록한다.
// 재실행(prebuild) 시 중복 삽입되지 않도록 마커 문자열로 가드한다.
function withPoseDetectorMainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('addFrameProcessorPlugin("detectPose")')) {
      return config;
    }

    if (!contents.includes(FRAME_PROCESSOR_IMPORT)) {
      const packageLineMatch = contents.match(/^package .+$/m);
      if (!packageLineMatch) {
        throw new Error('withPoseDetector: MainApplication.kt에서 package 선언을 찾지 못했습니다.');
      }
      const insertAt = contents.indexOf(packageLineMatch[0]) + packageLineMatch[0].length;
      contents = `${contents.slice(0, insertAt)}\n\n${FRAME_PROCESSOR_IMPORT}${contents.slice(insertAt)}`;
    }

    if (!contents.includes('super.onCreate()')) {
      throw new Error('withPoseDetector: MainApplication.kt에서 super.onCreate() 호출을 찾지 못했습니다.');
    }
    contents = contents.replace('super.onCreate()', `super.onCreate()\n${FRAME_PROCESSOR_REGISTRATION}`);

    config.modResults.contents = contents;
    return config;
  });
}

// PoseDetectorPlugin.kt(패키지명 재작성 후)와 pose_landmarker_lite.task 모델을
// 생성된 android/ 프로젝트에 복사한다. VideoTensor/ 폴더를 참조하지 않고
// 이 플러그인과 함께 커밋되는 plugins/native/ 소스를 사용하므로 prebuild마다 재현 가능하다.
function withPoseDetectorNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android && config.android.package;
      if (!packageName) {
        throw new Error('withPoseDetector: app.json의 android.package가 설정되어 있어야 합니다.');
      }
      const packagePath = packageName.split('.').join(path.sep);
      const androidRoot = config.modRequest.platformProjectRoot;

      const kotlinSrc = path.join(__dirname, 'native', 'PoseDetectorPlugin.kt');
      const kotlinDestDir = path.join(androidRoot, 'app', 'src', 'main', 'java', packagePath);
      fs.mkdirSync(kotlinDestDir, { recursive: true });
      const kotlinContents = fs
        .readFileSync(kotlinSrc, 'utf8')
        .replace(/^package .+$/m, `package ${packageName}`);
      fs.writeFileSync(path.join(kotlinDestDir, 'PoseDetectorPlugin.kt'), kotlinContents);

      const modelSrc = path.join(__dirname, 'native', 'pose_landmarker_lite.task');
      const assetsDestDir = path.join(androidRoot, 'app', 'src', 'main', 'assets');
      fs.mkdirSync(assetsDestDir, { recursive: true });
      fs.copyFileSync(modelSrc, path.join(assetsDestDir, 'pose_landmarker_lite.task'));

      return config;
    },
  ]);
}

module.exports = function withPoseDetector(config) {
  config = withPoseDetectorGradle(config);
  config = withPoseDetectorMainApplication(config);
  config = withPoseDetectorNativeFiles(config);
  return config;
};
