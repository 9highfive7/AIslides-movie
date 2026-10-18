/**
 * 台本 (public/script.json) の全セリフを音声化し、
 *   public/audio/{sceneId}_{index}.wav
 * に保存、各セリフの開始フレーム・長さを public/timeline.json に書き出す。
 *
 * 使い方:
 *   npm run audio        VOICEVOX Engine (http://localhost:50021) が必要
 *   npm run audio:mock   エンジンなし。概算尺の無音WAVでタイミングだけ検証する
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema, type ScriptConfig, type TimelineLine, type TimelineScene } from '../src/schemas';
import { lintScript } from '../src/elements';
import { stripMarkup } from '../shared/markup';
import {
  FPS,
  GAP_BETWEEN_LINES_FRAMES,
  SCENE_LEAD_FRAMES,
  SCENE_TAIL_FRAMES,
  TRANSITION_HALF_FRAMES,
} from '../shared/timing';
import { assertEngineAlive, loadVoicevoxConfig, synthesize } from './lib/voicevox';
import { readWavDuration, readWavPcm, writeSilentWav } from './lib/wav';
import { estimateDurationSec } from './lib/estimate';
import { levelsFromSamples, mockLevels } from './lib/levels';

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');

const fail = (message: string): never => {
  console.error(`\n[generate-audio] ${message}\n`);
  process.exit(1);
};

/** script.json を読み込んで検証する。不正なら起動方法を案内して例外を投げる */
const readScript = (scriptPath: string): ScriptConfig => {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`台本が見つかりません: ${scriptPath}`);
  }
  const result = scriptSchema.safeParse(JSON.parse(fs.readFileSync(scriptPath, 'utf8')));
  if (!result.success) {
    throw new Error(
      'script.json の形式が不正です:\n' +
        result.error.issues
          .map((issue) => `  - ${issue.path.join('.') || '(ルート)'}: ${issue.message}`)
          .join('\n'),
    );
  }
  for (const issue of lintScript(result.data)) {
    console.warn(`  注意: ${issue}`);
  }
  return result.data;
};

async function main(): Promise<void> {
  if (TRANSITION_HALF_FRAMES > Math.min(SCENE_LEAD_FRAMES, SCENE_TAIL_FRAMES)) {
    throw new Error('shared/timing.ts: TRANSITION_FRAMES の半分は SCENE_LEAD / SCENE_TAIL 以下にしてください');
  }
  const mock = process.argv.includes('--mock');

  const script = readScript(path.join(PUBLIC_DIR, 'script.json'));

  const config = loadVoicevoxConfig(path.join(ROOT, 'voicevox.config.json'));
  if (!mock) {
    await assertEngineAlive(config);
  }

  fs.rmSync(AUDIO_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  let cursor = 0; // 全体を通した現在フレーム
  const scenes: TimelineScene[] = [];

  console.log(
    mock
      ? `モックモード: VOICEVOX に接続せず、概算尺の無音WAVを生成します (speakerId=${config.speakerId} は未使用)\n`
      : `VOICEVOX: ${config.endpoint} / speaker=${config.speakerId} / speedScale=${config.speedScale}\n`,
  );

  for (const scene of script.scenes) {
    const startFrame = cursor;
    let lineStart = startFrame + SCENE_LEAD_FRAMES;
    const lines: TimelineLine[] = [];

    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const fileName = `${scene.id}_${i}.wav`;
      const filePath = path.join(AUDIO_DIR, fileName);
      // 字幕の **強調** は読み上げない。speech があれば読みを優先する
      const speech = line.speech ?? stripMarkup(line.text);

      let durationSec: number;
      let levels: string;
      if (mock) {
        durationSec = estimateDurationSec(speech, config.speedScale);
        writeSilentWav(filePath, durationSec);
        levels = mockLevels(Math.max(1, Math.round(durationSec * FPS)));
      } else {
        const wav = await synthesize({
          endpoint: config.endpoint,
          speakerId: config.speakerId,
          speedScale: config.speedScale,
          text: speech,
        });
        fs.writeFileSync(filePath, wav);
        durationSec = readWavDuration(wav);
        const pcm = readWavPcm(wav);
        levels = levelsFromSamples(pcm.samples, pcm.sampleRate, FPS, Math.max(1, Math.round(durationSec * FPS)));
      }

      const durationFrames = Math.max(1, Math.round(durationSec * FPS));
      lines.push({
        index: i,
        text: line.text,
        reveal: line.reveal,
        focus: line.focus,
        ...(line.sfx ? { sfx: line.sfx } : null),
        startFrame: lineStart,
        durationFrames,
        audioFile: `audio/${fileName}`,
        levels,
        mock,
      });
      console.log(
        `  [${scene.id}] line ${i}: ${durationSec.toFixed(2)}s (${durationFrames}f) ${mock ? '(mock)' : ''}`,
      );

      lineStart += durationFrames + GAP_BETWEEN_LINES_FRAMES;
    }

    // lineStart には最後のギャップが含まれるので除いてからシーン末尾の余白を足す
    const sceneDuration = lineStart - GAP_BETWEEN_LINES_FRAMES + SCENE_TAIL_FRAMES - startFrame;
    scenes.push({ id: scene.id, startFrame, durationFrames: sceneDuration, lines });
    cursor = startFrame + sceneDuration;
  }

  const timeline = { fps: FPS, totalFrames: cursor, scenes };
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'timeline.json'),
    JSON.stringify(timeline, null, 2) + '\n',
  );

  console.log(
    `\n完了: ${scenes.length}シーン / ${scenes.reduce((n, s) => n + s.lines.length, 0)}セリフ / ` +
      `総尺 ${(cursor / FPS).toFixed(1)}秒 (${cursor}フレーム)\n` +
      `→ public/timeline.json を更新しました${mock ? ' (mock: 音声は無音・尺は概算です)' : ''}`,
  );

  if (cursor > FPS * 600) {
    console.warn(
      `注意: 総尺が ${(cursor / FPS / 60).toFixed(1)}分 で10分を超えています。` +
        ' 台本の削減か speedScale の引き上げを検討してください。',
    );
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
