import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { KineticText } from '../components/KineticText';
import type { ContentOf } from './common';

/**
 * 章扉 (セクション区切り)。章番号が大きく「ドン」と落ちてきて、
 * 背景には巨大な輪郭だけの番号がゆっくり流れる。
 */
export const SectionLayout: React.FC<{ content: ContentOf<'section'> }> = ({ content }) => {
  const theme = useTheme();
  if (theme.chrome === 'editorial') {
    return <EditorialSection content={content} />;
  }
  return <StandardSection content={content} />;
};

/**
 * editorial (paper) の章扉。紙の上に、朱色の小さな章番号 (例: "1つ目") → 明朝の章題 → 下線。
 * 派手に動かさず、静かにふわっと出す。
 */
const EditorialSection: React.FC<{ content: ContentOf<'section'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const { number, title, subtitle } = content;

  const numP = springFrom(frame, introAt + 2, fps, SPRINGS.smooth);
  const titleAt = introAt + 10;
  const titleChars = [...title.replace(/\*\*|\n/g, '')].length;
  const lineP = springFrom(frame, titleAt + titleChars * 1.2 + 4, fps, SPRINGS.smooth);
  const subP = springFrom(frame, titleAt + titleChars * 1.2 + 10, fps, SPRINGS.smooth);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 160px 120px',
        fontFamily: theme.fonts.display,
      }}
    >
      {number ? (
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: theme.colors.warning,
            letterSpacing: '0.08em',
            marginBottom: 22,
            opacity: numP,
            transform: `translateY(${(1 - numP) * 14}px)`,
          }}
        >
          {number}
        </div>
      ) : null}
      <KineticText
        text={title}
        at={titleAt}
        stagger={1.2}
        rise={0.3}
        markerColor={theme.colors.darkHighlight}
        markerInk={theme.colors.darkHighlightInk}
        style={{ fontSize: 66, fontWeight: 600, letterSpacing: '0.04em', color: theme.colors.ink, textAlign: 'center' }}
      />
      <div
        style={{
          width: 400 * lineP,
          height: 2,
          backgroundColor: theme.colors.ink,
          margin: '34px 0 28px',
        }}
      />
      {subtitle ? (
        <div
          style={{
            fontFamily: theme.fonts.body,
            fontSize: 26,
            color: theme.colors.textSecondary,
            textAlign: 'center',
            opacity: subP,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 標準の章扉 (濃い背景) */
const StandardSection: React.FC<{ content: ContentOf<'section'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt, ts } = useSceneContext();
  const { number, title, subtitle } = content;

  const slam = springFrom(frame, introAt + 2, fps, SPRINGS.bouncy);
  const titleAt = introAt + (number ? 12 : 4);
  const titleChars = [...title.replace(/\*\*|\n/g, '')].length;
  const lineP = springFrom(frame, titleAt + titleChars * 1.8, fps, SPRINGS.smooth);
  const subP = springFrom(frame, titleAt + titleChars * 1.8 + 6, fps, SPRINGS.snappy);
  const drift = interpolate(frame, [ts.startFrame, ts.startFrame + ts.durationFrames], [0, -160]);

  return (
    <AbsoluteFill>
      {number ? (
        <div
          style={{
            position: 'absolute',
            right: -40 + drift,
            bottom: -120,
            fontSize: 620,
            fontWeight: 900,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `3px ${theme.colors.onDarkLine}`,
            opacity: interpolate(frame, [introAt, introAt + 20], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {number}
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 160px 100px',
        }}
      >
        {number ? (
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              color: theme.colors.onDarkAccent,
              letterSpacing: '0.06em',
              lineHeight: 1,
              marginBottom: 18,
              opacity: interpolate(slam, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `scale(${interpolate(slam, [0, 1], [2.4, 1])})`,
            }}
          >
            {number}
          </div>
        ) : null}
        <KineticText
          text={title}
          at={titleAt}
          stagger={1.8}
          markerColor={theme.colors.darkHighlight}
          markerInk={theme.colors.darkHighlightInk}
        marker="block"
          style={{ fontSize: 60, fontWeight: 900, color: theme.colors.onDark, textAlign: 'center' }}
        />
        <div
          style={{
            width: 80 * lineP,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.onDarkAccent,
            margin: '30px 0',
          }}
        />
        {subtitle ? (
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: theme.colors.onDarkSecondary,
              textAlign: 'center',
              opacity: subP,
              transform: `translateY(${(1 - subP) * 16}px)`,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
