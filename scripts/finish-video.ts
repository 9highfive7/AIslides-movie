/**
 * 書き出した MP4 の音量を YouTube の基準 (-14 LUFS) にそろえる。
 *   npm run finish              → out/video.mp4
 *   npm run finish -- path.mp4  → 指定したファイル
 */
import path from 'node:path';
import { normalizeLoudness } from './lib/finish';

const file = path.resolve(process.argv[2] ?? 'out/video.mp4');
normalizeLoudness(file).then(
  (before) =>
    console.log(before === null ? `[finish] 音声が無音のため、そのままにしました: ${file}` : `[finish] 音量 ${before.toFixed(1)} LUFS → -14 LUFS: ${file}`),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
