import React from 'react';
import { Reveal } from '../components/Reveal';
import { COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type AxesScene = Extract<Scene, { layout: 'axes' }>;

/**
 * 空の直角座標系の図解。2軸の関係をナレーションで語る導入カットに使う。
 * reveal 要素: "axes" (座標軸一式) と "hint" (下の補足文)。
 */
export const AxesLayout: React.FC<{ content: AxesScene['content']; revealAt: RevealAt }> = ({
  content,
  revealAt,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Reveal at={revealAt('axes')}>
        <svg width={980} height={440} viewBox="0 0 980 440">
          {/* 横グリッド線 */}
          {[110, 200, 290].map((y) => (
            <line key={y} x1={90} y1={y} x2={890} y2={y} stroke={COLORS.line} strokeWidth={1.5} />
          ))}
          {/* Y軸 */}
          <line x1={90} y1={400} x2={90} y2={40} stroke={COLORS.ink} strokeWidth={2.5} />
          <polygon points="90,26 82,44 98,44" fill={COLORS.ink} />
          {/* X軸 */}
          <line x1={90} y1={400} x2={900} y2={400} stroke={COLORS.ink} strokeWidth={2.5} />
          <polygon points="914,400 896,392 896,408" fill={COLORS.ink} />
          {/* 軸ラベル */}
          <text x={110} y={58} fontSize={21} fontWeight={700} fill={COLORS.ink}>
            {content.yAxis.label}
          </text>
          <text x={890} y={436} fontSize={18} fill={COLORS.textSecondary} textAnchor="end">
            {content.xAxis.label}
          </text>
        </svg>
      </Reveal>
      {content.hint ? (
        <Reveal at={revealAt('hint')} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 19, color: COLORS.textSecondary }}>{content.hint}</div>
        </Reveal>
      ) : null}
    </div>
  );
};
