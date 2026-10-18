/**
 * YouTube に投稿するための付属ファイルを out/youtube/ に書き出す。
 *   description.txt  概要欄にそのまま貼れるタイトル + 目次 (チャプター)
 *   captions.srt     字幕ファイル (YouTube Studio → 字幕 → ファイルをアップロード)
 *   metadata.json    タイトル・尺・チャプターの機械可読版
 *
 * 使い方: npm run youtube   (先に npm run audio で timeline.json を作っておく)
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema, timelineSchema } from '../src/schemas';
import { buildChapters, buildDescription, buildSrt, formatTimestamp, videoTitle } from './lib/youtube';

const ROOT = path.resolve(__dirname, '..');

const readJson = (file: string): unknown => {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    throw new Error(`${file} がありません。先に npm run audio を実行してください。`);
  }
  return JSON.parse(fs.readFileSync(full, 'utf8')) as unknown;
};

async function main(): Promise<void> {
  const script = scriptSchema.parse(readJson('public/script.json'));
  const timeline = timelineSchema.parse(readJson('public/timeline.json'));

  const { chapters, warnings } = buildChapters(script, timeline);
  const outDir = path.join(ROOT, 'out', 'youtube');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'description.txt'), buildDescription(script, chapters));
  fs.writeFileSync(path.join(outDir, 'captions.srt'), buildSrt(timeline));
  fs.writeFileSync(
    path.join(outDir, 'metadata.json'),
    JSON.stringify(
      {
        title: videoTitle(script),
        durationSec: Number((timeline.totalFrames / timeline.fps).toFixed(2)),
        chapters: chapters.map((c) => ({ ...c, timestamp: formatTimestamp(c.startSec) })),
        mockAudio: timeline.scenes.some((s) => s.lines.some((l) => l.mock)),
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`out/youtube/ に書き出しました (チャプター ${chapters.length}個)`);
  for (const c of chapters) {
    console.log(`  ${formatTimestamp(c.startSec)} ${c.label}`);
  }
  for (const w of warnings) {
    console.warn(`注意: ${w}`);
  }
}

main().catch((error: unknown) => {
  console.error(`\n[generate-youtube] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
