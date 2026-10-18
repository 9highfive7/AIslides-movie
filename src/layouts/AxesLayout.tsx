import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

/**
 * 空の直角座標系の図解。2軸の関係をナレーションで語る導入カットに使う。
 * reveal 要素: "axes" (座標軸一式。線が引かれるように出現) と "hint" (下の補足文)。
 */
export const AxesLayout: React.FC<{ content: ContentOf<'axes'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const at = ctx.appearAt('axes', 0);
  const yP = springFrom(frame, at, fps, SPRINGS.smooth);
  const xP = springFrom(frame, at + 6, fps, SPRINGS.smooth);
  const gridP = springFrom(frame, at + 12, fps, SPRINGS.smooth);
  const labelO = interpolate(frame, [at + 16, at + 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const yLen = 360;
  const xLen = 810;

  return (
    <ContentArea style={{ flexDirection: 'column' }}>
      <svg width={980} height={440} viewBox="0 0 980 440">
        {[110, 200, 290].map((y) => (
          <line key={y} x1={90} y1={y} x2={90 + 800 * gridP} y2={y} stroke={theme.colors.line} strokeWidth={1.5} />
        ))}
        <line
          x1={90}
          y1={400}
          x2={90}
          y2={40}
          stroke={theme.colors.ink}
          strokeWidth={3}
          strokeDasharray={yLen}
          strokeDashoffset={(1 - yP) * yLen}
        />
        <polygon points="90,26 82,44 98,44" fill={theme.colors.ink} opacity={yP > 0.95 ? 1 : 0} />
        <line
          x1={90}
          y1={400}
          x2={900}
          y2={400}
          stroke={theme.colors.ink}
          strokeWidth={3}
          strokeDasharray={xLen}
          strokeDashoffset={(1 - xP) * xLen}
        />
        <polygon points="914,400 896,392 896,408" fill={theme.colors.ink} opacity={xP > 0.95 ? 1 : 0} />
        <text x={110} y={58} fontSize={22} fontWeight={800} fill={theme.colors.ink} opacity={labelO}>
          {content.yAxis.label}
        </text>
        <text x={890} y={436} fontSize={19} fill={theme.colors.textSecondary} textAnchor="end" opacity={labelO}>
          {content.xAxis.label}
        </text>
      </svg>
      {content.hint ? (
        <Reveal id="hint" order={4} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 20, color: theme.colors.textSecondary }}>{content.hint}</div>
        </Reveal>
      ) : null}
    </ContentArea>
  );
};
