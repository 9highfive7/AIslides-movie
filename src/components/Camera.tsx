import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';

/**
 * シーンの間ゆっくりズームインし続ける「カメラの動き」(ケン・バーンズ効果)。
 * 静止画のスライドでも画面が生きて見える。
 * mode: "3d" では画面全体を奥行きのある板として扱い、冒頭に横から回り込んで正面に収まり、
 * その後も少し傾いたままゆっくり左右に揺れる (立体の画面を見回しているように見える)。
 */
export const Camera: React.FC<{
  enabled: boolean;
  mode?: '3d' | 'flat';
  from: number;
  to: number;
  children: React.ReactNode;
}> = ({ enabled, mode = 'flat', from, to, children }) => {
  const frame = useCurrentFrame();
  const scale = enabled
    ? interpolate(frame, [from, to], [1, 1.035], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  if (!enabled || mode === 'flat') {
    return <AbsoluteFill style={{ transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
  }

  const t = frame - from;
  const swing = interpolate(t, [0, 45], [-9, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const sway = Math.sin(t / 110) * 2.2;
  const tilt = 4 + Math.sin(t / 150) * 1.2;

  return (
    <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 38%' }}>
      <AbsoluteFill
        style={{
          transform: `rotateX(${tilt}deg) rotateY(${swing + sway}deg) scale(${scale})`,
          transformOrigin: '50% 55%',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
