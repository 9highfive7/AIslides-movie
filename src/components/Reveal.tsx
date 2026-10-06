import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { REVEAL_FRAMES } from '../theme';

/**
 * 要素の出現アニメーション。
 * at (= そのセリフの開始フレーム) から 0.4秒かけて
 * フェードイン + 上から少しスライドして出現する。
 * at === null は「reveal 未指定 → 常時表示」。
 */
export const Reveal: React.FC<{
  at: number | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, children, style }) => {
  const frame = useCurrentFrame();

  if (at === null) {
    return <div style={style}>{children}</div>;
  }

  const t = interpolate(frame, [at, at + REVEAL_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * -14}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
