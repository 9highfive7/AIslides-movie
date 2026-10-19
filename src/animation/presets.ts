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
    // ここから立体的な出現。transform の perspective() で奥行きを付けるので、親の設定は不要
    case 'rise3d':
      // 飛び出す絵本のように、床に寝ていた板が起き上がる
      return {
        opacity,
        transform: `perspective(1400px) rotateX(${rest * 80}deg)`,
        transformOrigin: '50% 100%',
      };
    case 'drop3d':
      // 画面の手前 (カメラ側) から飛んできて着地する。バネの行き過ぎで少し沈んで戻る
      return {
        opacity,
        transform: `perspective(1400px) translateZ(${rest * 520}px) rotateX(${rest * -18}deg)`,
      };
    case 'swing3d':
      // 左端を軸に、奥に開いていた扉が手前に閉じてくるように回り込む
      return {
        opacity,
        transform: `perspective(1600px) rotateY(${rest * 80}deg)`,
        transformOrigin: '0% 50%',
      };
    case 'flip3d':
      // カードをくるっと裏返して表を見せる
      return {
        opacity,
        transform: `perspective(1400px) rotateY(${rest * 160}deg)`,
        backfaceVisibility: 'hidden',
      };
    case 'none':
      return {};
  }
};

/** style: "3d" で auto を使うとき、平面の出現をそれに近い立体の出現に置き換える */
export const to3dPreset = (preset: Exclude<RevealPreset, 'auto'>): Exclude<RevealPreset, 'auto'> => {
  switch (preset) {
    case 'fadeUp':
    case 'blur':
      return 'rise3d';
    case 'pop':
    case 'zoom':
      return 'drop3d';
    case 'slideLeft':
      return 'swing3d';
    case 'slideRight':
    case 'flip':
      return 'flip3d';
    default:
      return preset;
  }
};

/** プリセットごとのバネ。弾ませたいものだけ bouncy */
export const springForPreset = (preset: Exclude<RevealPreset, 'auto'>): Partial<SpringConfig> =>
  preset === 'pop' || preset === 'drop3d' || preset === 'flip3d' ? SPRINGS.bouncy : SPRINGS.snappy;
