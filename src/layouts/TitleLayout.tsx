import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { KineticText } from '../components/KineticText';
import type { ContentOf } from './common';

/**
 * タイトルシーン。濃い背景 + 白文字。
 * キッカー (英字) の字間が締まりながら出現 → タイトルが1文字ずつ弾む → 下線が伸びる → サブタイトル。
 */
export const TitleLayout: React.FC<{ content: ContentOf<'title'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const { kicker, title, subtitle } = content;

  const kickerP = springFrom(frame, introAt + 2, fps, SPRINGS.smooth);
  const titleAt = introAt + 10;
  const titleChars = [...title.replace(/\*\*|\n/g, '')].length;
  const lineP = springFrom(frame, titleAt + titleChars * 2 + 2, fps, SPRINGS.smooth);
  const subP = springFrom(frame, titleAt + titleChars * 2 + 8, fps, SPRINGS.snappy);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 160px 140px',
      }}
    >
      {kicker ? (
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: `${interpolate(kickerP, [0, 1], [0.9, 0.34])}em`,
            color: theme.colors.onDarkAccent,
            marginBottom: 34,
            opacity: kickerP,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <KineticText
        text={title}
        at={titleAt}
        stagger={2}
        rise={0.8}
        markerColor={theme.colors.darkHighlight}
        markerInk={theme.colors.darkHighlightInk}
        marker="block"
        style={{
          fontSize: 84,
          fontWeight: 900,
          color: theme.colors.onDark,
          lineHeight: 1.3,
          textAlign: 'center',
          textShadow: '0 6px 24px rgba(0,0,0,0.25)',
        }}
      />
      <div
        style={{
          width: 120 * lineP,
          height: 5,
          borderRadius: 3,
          backgroundColor: theme.colors.onDarkAccent,
          margin: '38px 0',
        }}
      />
      {subtitle ? (
        <div
          style={{
            fontSize: 27,
            fontWeight: 500,
            color: theme.colors.onDarkSecondary,
            textAlign: 'center',
            lineHeight: 1.7,
            opacity: subP,
            transform: `translateY(${(1 - subP) * 20}px)`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
