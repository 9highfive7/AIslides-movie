import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * シーンの間ゆっくりズームインし続ける「カメラの動き」(ケン・バーンズ効果)。
 * 静止画のスライドでも画面が生きて見える。
 */
export const Camera: React.FC<{
  enabled: boolean;
  from: number;
  to: number;
  children: React.ReactNode;
}> = ({ enabled, from, to, children }) => {
  const frame = useCurrentFrame();
  const scale = enabled
    ? interpolate(frame, [from, to], [1, 1.035], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  return <AbsoluteFill style={{ transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
};
