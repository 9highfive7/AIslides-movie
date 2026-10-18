/**
 * 効果音をプログラムで合成する (外部素材なし・著作権の心配なし)。
 * npm run sfx で public/sfx/*.wav に書き出す。乱数は固定シードなので毎回同じ音になる。
 */
export const SFX_SAMPLE_RATE = 44100;

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const normalize = (samples: Float32Array, peak = 0.8): Float32Array => {
  let max = 0;
  for (const s of samples) {
    max = Math.max(max, Math.abs(s));
  }
  if (max > 0) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (samples[i] / max) * peak;
    }
  }
  return samples;
};

const make = (seconds: number, fn: (t: number, i: number) => number): Float32Array => {
  const n = Math.round(seconds * SFX_SAMPLE_RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = fn(i / SFX_SAMPLE_RATE, i);
  }
  return out;
};

/** 要素が出るときの「ポン」: 下がっていく短いサイン波 */
export const pop = (): Float32Array => {
  let phase = 0;
  return normalize(
    make(0.14, (t) => {
      const freq = 420 + 680 * Math.exp(-t * 45);
      phase += (2 * Math.PI * freq) / SFX_SAMPLE_RATE;
      const env = Math.min(1, t / 0.002) * Math.exp(-t * 38);
      return (Math.sin(phase) + 0.25 * Math.sin(phase * 2)) * env;
    }),
    0.7,
  );
};

/** シーン切り替えの「シュッ」: 帯域が上下するノイズ */
export const whoosh = (): Float32Array => {
  const rand = mulberry32(7);
  const duration = 0.55;
  let low = 0;
  let band = 0;
  return normalize(
    make(duration, (t) => {
      const x = rand() * 2 - 1;
      const pos = t / duration;
      const fc = 350 + 2600 * Math.sin(Math.PI * Math.min(1, pos * 1.1)) ** 2;
      const f = 2 * Math.sin((Math.PI * fc) / SFX_SAMPLE_RATE);
      const q = 0.9;
      low += f * band;
      const high = x - low - q * band;
      band += f * high;
      const env = Math.sin(Math.PI * Math.min(1, pos)) ** 2 * (pos < 0.6 ? 1 : 1 - (pos - 0.6) / 0.4);
      return band * env;
    }),
    0.6,
  );
};

/** 強調の「チーン」: 倍音を持つ減衰サイン */
export const ding = (): Float32Array =>
  normalize(
    make(1.0, (t) => {
      const env = Math.min(1, t / 0.003) * Math.exp(-t * 4.5);
      return (
        (Math.sin(2 * Math.PI * 1320 * t) +
          0.45 * Math.sin(2 * Math.PI * 2640 * t) * Math.exp(-t * 3) +
          0.18 * Math.sin(2 * Math.PI * 3990 * t) * Math.exp(-t * 6)) *
        env
      );
    }),
    0.6,
  );

/** ボタンの「カチッ」 */
export const click = (): Float32Array => {
  const rand = mulberry32(11);
  return normalize(
    make(0.06, (t) => {
      const env = Math.exp(-t * 140);
      return (0.6 * Math.sin(2 * Math.PI * 2100 * t) + 0.5 * (rand() * 2 - 1)) * env;
    }),
    0.7,
  );
};

export const SFX_GENERATORS = { pop, whoosh, ding, click } as const;
