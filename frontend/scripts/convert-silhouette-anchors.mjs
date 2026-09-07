#!/usr/bin/env node
// output_new_exercises/**/*.json(extract_pose.py 원본 포맷)의 2D landmarks(px/py, 이미지
// 픽셀 절대좌표)에서 엉덩이 중점/어깨너비/이미지 크기만 뽑아 frontend/assets/pose-silhouettes/
// anchors.json 하나로 모은다. PoseGuideSilhouette가 라이브 엉덩이/어깨 위치에 맞춰 실루엣을
// 실시간으로 배치/스케일할 때 쓰는 기준값이다.
//
// convert-pose-json.mjs(world_landmarks -> assets/poses/*.json)와 소스가 같지만, 이쪽은
// 2D landmarks(px/py)를 쓴다 — 실루엣 PNG(assets/pose-silhouettes/*.png)와 동일한 원본
// 사진에서 추출된 값이라 이미지 픽셀 좌표계가 그대로 일치한다(image_size로 확인됨).
//
// 사용법: node scripts/convert-silhouette-anchors.mjs [output_new_exercises 경로]
// (기본 경로가 이 레포 기준 상대 위치에 없을 수 있어 인자로 override 가능하게 둔다.)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = process.argv[2] ?? join(__dirname, '..', '..', 'output_new_exercises');
const OUT_DIR = join(__dirname, '..', 'assets', 'pose-silhouettes');
const OUT_FILE = join(OUT_DIR, 'anchors.json');

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;

mkdirSync(OUT_DIR, { recursive: true });

function findLandmark(landmarks, index) {
  const lm = landmarks.find((l) => l.index === index);
  if (!lm) throw new Error(`landmark index ${index}를 찾을 수 없습니다`);
  return lm;
}

const sourceDirs = readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(SRC_ROOT, d.name));

const anchors = {};

for (const dir of sourceDirs) {
  const jsonFiles = readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
    const landmarks = raw.landmarks;
    if (!Array.isArray(landmarks) || landmarks.length !== 33) {
      throw new Error(`${file}: landmarks가 33개가 아닙니다 (${landmarks?.length})`);
    }

    const lShoulder = findLandmark(landmarks, L_SHOULDER);
    const rShoulder = findLandmark(landmarks, R_SHOULDER);
    const lHip = findLandmark(landmarks, L_HIP);
    const rHip = findLandmark(landmarks, R_HIP);

    const poseName = file.replace(/\.json$/, '');
    anchors[poseName] = {
      hipPx: {
        x: (lHip.px + rHip.px) / 2,
        y: (lHip.py + rHip.py) / 2,
      },
      shoulderWidthPx: Math.hypot(rShoulder.px - lShoulder.px, rShoulder.py - lShoulder.py),
      imageWidth: raw.image_size.width,
      imageHeight: raw.image_size.height,
    };
    console.log(`${file} -> anchors.${poseName}`);
  }
}

const count = Object.keys(anchors).length;
if (count !== 16) {
  throw new Error(`포즈 16개가 아니라 ${count}개 추출됨 - 키: ${Object.keys(anchors).join(', ')}`);
}

writeFileSync(OUT_FILE, JSON.stringify(anchors, null, 2));
console.log(`완료: ${count}개 포즈 -> ${OUT_FILE}`);
