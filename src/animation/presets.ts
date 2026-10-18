import type { CSSProperties } from 'react';
import { interpolate, spring, type SpringConfig } from 'remotion';
import type { RevealPreset } from '../schemas';

/** バネの設定。snappy を基本に、ポップな出現だけ bouncy を使う */
export const SPRINGS = {
  /** 揺れなし。線を引く・バーを伸ばすなど */
  smooth: { damping: 200, mass: 1, stiffness: 100 },
  /** ほんの少しだけ行き過ぎる。標準の出現 */
  snappy: { damping: 15, mass: 0.7, stiffness: 150 },
  /** はっきり弾む。カードのポップ・ボタン */
  bouncy: { damping: 9, mass: 0.6, stiffness: 140 },
} satisfies Record<string, Partial<SpringConfig>>;

/**
 * at フレームから始まるバネの進み具合 (0 → 1。bouncy は 1 を少し超えて戻る)。
 * at が null の場合は最初から完了 (1) とみなす。
 */
export const springFrom = (
  frame: number,
  at: number | null,
  fps: number,
  config: Partial<SpringConfig> = SPRINGS.snappy,
): number => {
  if (at === null) {
    return 1;
  }
  return spring({ frame: Math.max(0, frame - at), fps, config });
};

/** 出現アニメーションの見た目。p はバネの進み具合 (0 → 1、行き過ぎあり) */
export const revealStyle = (preset: Exclude<RevealPreset, 'auto'>, p: number): CSSProperties => {
  const opacity = interpolate(p, [0, 0.55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rest = 1 - p;

  switch (preset) {
    case 'fadeUp':
      return { opacity, transform: `translateY(${rest * 40}px)` };
    case 'pop':
      return { opacity, transform: `scale(${0.55 + 0.45 * p})` };
    case 'slideLeft':
      return { opacity, transform: `translateX(${rest * -140}px)` };
    case 'slideRight':
      return { opacity, transform: `translateX(${rest * 140}px)` };
    case 'zoom':
      return {
        opacity,
        transform: `scale(${1.35 - 0.35 * p})`,
        filter: `blur(${Math.max(0, 1 - opacity) * 10}px)`,
      };
    case 'blur':
      return {
        opacity,
        transform: `translateY(${rest * 12}px)`,
        filter: `blur(${Math.max(0, 1 - opacity) * 16}px)`,
      };
    case 'flip':
      return {
        opacity,
        transform: `perspective(1200px) rotateX(${rest * -85}deg)`,
        transformOrigin: '50% 0%',
      };
    case 'none':
      return {};
  }
};

/** プリセットごとのバネ。弾ませたいものだけ bouncy */
export const springForPreset = (preset: Exclude<RevealPreset, 'auto'>): Partial<SpringConfig> =>
  preset === 'pop' ? SPRINGS.bouncy : SPRINGS.snappy;
