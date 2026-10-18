import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PAGE, useTheme } from '../theme';
import { SPRINGS, springFrom } from '../animation/presets';
import { KineticText } from './KineticText';

/**
 * コンテンツシーン用の見出し。左上に配置し、
 * 英字ラベルが左から滑り込み → 見出しが1文字ずつ出現 → 下線が伸びる。
 */
export const HeadingChrome: React.FC<{ heading: string; label?: string; at: number }> = ({
  heading,
  label,
  at,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelP = springFrom(frame, at, fps, SPRINGS.snappy);
  const headingAt = at + (label ? 4 : 0);
  const lineP = springFrom(frame, headingAt + Math.min(20, [...heading].length * 1.2) + 2, fps, SPRINGS.smooth);

  return (
    <div style={{ position: 'absolute', left: PAGE.paddingX, top: 84 }}>
      {label ? (
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: theme.colors.accent,
            opacity: interpolate(labelP, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateX(${(1 - labelP) * -40}px)`,
          }}
        >
          {label}
        </div>
      ) : null}
      <KineticText
        text={heading}
        at={headingAt}
        stagger={1.2}
        rise={0.5}
        markerColor={theme.colors.highlight}
        markerInk={theme.colors.highlightInk}
        style={{
          margin: '12px 0 0',
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: '0.02em',
          color: theme.colors.ink,
        }}
      />
      <div
        style={{
          width: 56 * labelP * lineP + 0.001,
          height: 5,
          borderRadius: 3,
          backgroundColor: theme.colors.accent,
          marginTop: 20,
        }}
      />
    </div>
  );
};
