/**
 * 効果音 (pop / whoosh / ding / click) を合成して public/sfx/ に書き出す。
 * 生成物はリポジトリに同梱済み。音を変えたいときだけ scripts/lib/sfx.ts を編集して再実行する。
 *   npm run sfx
 */
import fs from 'node:fs';
import path from 'node:path';
import { SFX_GENERATORS, SFX_SAMPLE_RATE } from './lib/sfx';
import { writeWav } from './lib/wav';

const outDir = path.resolve(__dirname, '..', 'public', 'sfx');
fs.mkdirSync(outDir, { recursive: true });

for (const [name, generate] of Object.entries(SFX_GENERATORS)) {
  const file = path.join(outDir, `${name}.wav`);
  const samples = generate();
  writeWav(file, samples, SFX_SAMPLE_RATE);
  console.log(`  ${path.relative(process.cwd(), file)} (${(samples.length / SFX_SAMPLE_RATE).toFixed(2)}s)`);
}
