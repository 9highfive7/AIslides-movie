/**
 * YouTube に上げる MP4 の仕上げ。
 *
 * - 書き出しの設定 (YOUTUBE_RENDER): YouTube の推奨 (H.264 / yuv420p / BT.709 / AAC 48kHz) に合わせ、
 *   画質は CRF で決める (再エンコードされても劣化が目立たないよう、推奨のビットレートより高めに出る値)
 * - 音量 (normalizeLoudness): YouTube は -14 LUFS 前後に音量をそろえる。大きすぎる動画は下げられるが、
 *   小さすぎる動画は上げてもらえないので、書き出し後にナレーションの大きさを -14 LUFS に合わせる。
 *   映像はそのまま (コピー) で、音声だけ作り直す
 *
 * ffmpeg は Remotion に同梱のものを使う (別にインストールしなくてよい)。
 */
import fs from 'node:fs';
import { RenderInternals } from '@remotion/renderer';
import sharp from 'sharp';

/** renderMedia にそのまま渡す書き出しの設定 */
export const YOUTUBE_RENDER = {
  codec: 'h264',
  crf: 16,
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  x264Preset: 'medium',
  audioCodec: 'aac',
  audioBitrate: '320k',
} as const;

/** YouTube のサムネイルの上限 (2MB)。写真のような絵を背景にすると PNG が大きくなりやすい */
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

/** サムネイルが上限を超えていたら、色数を減らした PNG に圧縮し直す */
export const fitThumbnail = async (file: string): Promise<void> => {
  if (fs.statSync(file).size <= THUMBNAIL_MAX_BYTES) return;
  const data = await sharp(file).png({ palette: true, quality: 95, compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(file, data);
};

/** 目標の音量 (YouTube の基準) と、音割れしない上限 */
const TARGET = { lufs: -14, truePeak: -1.5, range: 11 } as const;

const ff = (args: string[]) =>
  RenderInternals.callFf({ bin: 'ffmpeg', args, indent: false, logLevel: 'error', binariesDirectory: null, cancelSignal: undefined });

interface Measured {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

/**
 * 音声の大きさを -14 LUFS にそろえる (2回に分けて測る → 合わせる。そのほうが自然に仕上がる)。
 * 無音 (仮音声) の動画や、測れなかったときは何もしない。戻り値は合わせる前の大きさ [LUFS] (測れなければ null)
 */
export const normalizeLoudness = async (file: string): Promise<number | null> => {
  const filter = `loudnorm=I=${TARGET.lufs}:TP=${TARGET.truePeak}:LRA=${TARGET.range}`;
  const probe = await ff(['-hide_banner', '-nostats', '-i', file, '-vn', '-af', `${filter}:print_format=json`, '-f', 'null', '-']);
  const json = /\{[^{}]*"input_i"[^{}]*\}/.exec(probe.stderr)?.[0];
  if (!json) return null;
  const m = JSON.parse(json) as Measured;
  const inputI = Number(m.input_i);
  // 無音 (-inf) は合わせようがない。すでに目標に近いならそのまま
  if (!Number.isFinite(inputI) || inputI < -60) return null;
  if (Math.abs(inputI - TARGET.lufs) < 0.5 && Number(m.input_tp) <= TARGET.truePeak) return inputI;

  const tmp = file.replace(/\.mp4$/i, '') + '.loudnorm.mp4';
  const apply =
    `${filter}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await ff([
    '-hide_banner', '-nostats', '-y', '-i', file,
    '-map', '0', '-c:v', 'copy',
    '-af', apply, '-ar', '48000', '-c:a', 'aac', '-b:a', YOUTUBE_RENDER.audioBitrate,
    '-movflags', '+faststart',
    tmp,
  ]);
  fs.renameSync(tmp, file);
  return inputI;
};
