import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SPRINGS, springFrom } from '../animation/presets';

/**
 * 左から右へ線が引かれ、最後に矢じりが出る矢印。
 * 線が引き終わった後は、点が矢印に沿って流れ続ける (データの流れの表現)。
 */
export const DrawArrow: React.FC<{
  at: number;
  width?: number;
  color: string;
  flowColor?: string;
}> = ({ at, width = 72, color, flowColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springFrom(frame, at, fps, SPRINGS.smooth);

  const height = 36;
  const y = height / 2;
  const x1 = 6;
  const x2 = width - 14;
  const len = x2 - x1;
  const headScale = interpolate(p, [0.7, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // 矢印に沿って流れる点 (描画完了後のみ)
  const flowT = ((frame - at) % 40) / 40;
  const dotX = x1 + flowT * len;
  const dotOpacity = p > 0.98 && frame > at ? Math.sin(flowT * Math.PI) : 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={(1 - p) * len}
      />
      <polygon
        points={`${width - 2},${y} ${x2 - 6},${y - 9} ${x2 - 6},${y + 9}`}
        fill={color}
        transform={`translate(${x2} ${y}) scale(${headScale}) translate(${-x2} ${-y})`}
      />
      <circle cx={dotX} cy={y} r={4.5} fill={flowColor ?? color} opacity={dotOpacity} />
    </svg>
  );
};
