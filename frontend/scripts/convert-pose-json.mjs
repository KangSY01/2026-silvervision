#!/usr/bin/env node
// output_new_exercises/**/*.json(extract_pose.py 원본 포맷: landmarks + world_landmarks 객체 배열)을
// frontend/assets/poses/*.json(world_landmarks의 [x,y,z]만 index 순서로 뽑은 33개 배열)로 변환.
// 기존 frontend/assets/poses/pose_0.json과 값 대조로 이미 검증된 포맷을 그대로 따른다.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = join(__dirname, '..', '..', 'output_new_exercises');
const OUT_DIR = join(__dirname, '..', 'assets', 'poses');

mkdirSync(OUT_DIR, { recursive: true });

const sourceDirs = readdirSync(SRC_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(SRC_ROOT, d.name));

let count = 0;
for (const dir of sourceDirs) {
  const jsonFiles = readdirSync(dir).filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
    const worldLandmarks = raw.world_landmarks;
    if (!Array.isArray(worldLandmarks) || worldLandmarks.length !== 33) {
      throw new Error(`${file}: world_landmarks가 33개가 아닙니다 (${worldLandmarks?.length})`);
    }
    const triples = [...worldLandmarks]
      .sort((a, b) => a.index - b.index)
      .map((lm) => [lm.x, lm.y, lm.z]);

    const outPath = join(OUT_DIR, file);
    writeFileSync(outPath, JSON.stringify(triples));
    count += 1;
    console.log(`${file} -> ${outPath}`);
  }
}

console.log(`완료: ${count}개 변환`);
