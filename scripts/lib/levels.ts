/**
 * アバターの口パク用に、音声の音量を1フレームごとに 0〜9 の数字列へ変換する。
 * 例: "0013578753100..." (timeline.json の levels)
 */
export const levelsFromSamples = (samples: Float32Array, sampleRate: number, fps: number, frames: number): string => {
  const perFrame = sampleRate / fps;
  const rms: number[] = [];
  for (let f = 0; f < frames; f++) {
    const from = Math.floor(f * perFrame);
    const to = Math.min(samples.length, Math.floor((f + 1) * perFrame));
    let sum = 0;
    for (let i = from; i < to; i++) {
      sum += samples[i] * samples[i];
    }
    rms.push(to > from ? Math.sqrt(sum / (to - from)) : 0);
  }
  // 大きめの音 (上位5%) を 9 とみなして正規化する。小さすぎる音は口を閉じる
  const sorted = [...rms].sort((a, b) => a - b);
  const ref = Math.max(sorted[Math.floor(sorted.length * 0.95)] ?? 0, 1e-4);
  return rms.map((v) => (v < ref * 0.08 ? 0 : Math.min(9, Math.round((v / ref) * 9)))).join('');
};

/** モック用: 音声がないので、それらしいリズムで口を動かす */
export const mockLevels = (frames: number): string =>
  Array.from({ length: frames }, (_, k) => {
    if (k < 2 || k > frames - 3) {
      return 0;
    }
    const v = Math.abs(Math.sin(k * 0.85 + 0.6 * Math.sin(k * 0.21)));
    return Math.round(v * 8);
  }).join('');
