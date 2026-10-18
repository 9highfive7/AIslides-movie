import type { CSSProperties } from 'react';
import { Easing } from 'remotion';
import type { TransitionType } from '../schemas';

const ease = Easing.inOut(Easing.cubic);

/**
 * シーンに入ってくる側のスタイル。t は 0 (開始) → 1 (完了)。
 * 入ってくるシーンは前のシーンより上に重なって描画される。
 */
export const transitionIn = (type: TransitionType, linear: number): CSSProperties => {
  const t = ease(linear);
  switch (type) {
    case 'slide':
      return { transform: `translateX(${(1 - t) * 100}%)` };
    case 'slideUp':
      return { transform: `translateY(${(1 - t) * 100}%)` };
    case 'wipe':
      return { clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` };
    case 'zoom':
      return { opacity: t, transform: `scale(${1.25 - 0.25 * t})` };
    case 'circle':
      return { clipPath: `circle(${t * 75}% at 50% 50%)` };
    case 'fade':
      return { opacity: t };
    case 'none':
      return { opacity: linear < 0.5 ? 0 : 1 };
  }
};

/** シーンから出ていく側のスタイル (type は次のシーンのトランジション) */
export const transitionOut = (type: TransitionType, linear: number): CSSProperties => {
  const t = ease(linear);
  switch (type) {
    case 'slide':
      return { transform: `translateX(${-t * 100}%)` };
    case 'slideUp':
      return { transform: `translateY(${-t * 100}%)` };
    case 'wipe':
      return { transform: `translateX(${-t * 6}%)` };
    case 'zoom':
      return { transform: `scale(${1 + 0.15 * t})`, filter: `blur(${t * 6}px)` };
    case 'circle':
    case 'fade':
      return {};
    case 'none':
      return { opacity: linear < 0.5 ? 1 : 0 };
  }
};
