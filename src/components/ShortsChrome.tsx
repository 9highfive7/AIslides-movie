import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../themes';
import { SHORTS } from '../stage';
import { SPRINGS, springFrom } from '../animation/presets';
import { KineticText } from './KineticText';

/**
 * 縦の動画 (ショート) の見出し。上の UI (タブ・検索) の下、右のボタンにかからない範囲の中央に出す。
 * 横の動画の見出しより大きく、長いときは折り返す。**強調** にはマーカーが引かれる。
 * backdrop: 絵や 3D の上に出すとき。どんな絵の上でも読めるよう、紙色の下地を敷く
 */
export const ShortsHeading: React.FC<{ text: string; label?: string; at: number; backdrop?: boolean }> = ({
  text,
  label,
  at,
  backdrop = false,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const editorial = theme.chrome === 'editorial';
  const p = springFrom(frame, at, fps, SPRINGS.smooth);
  const shown = interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        left: SHORTS.safe.left,
        right: SHORTS.safe.right,
        top: SHORTS.headingTop,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {label ? (
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.3em', color: theme.colors.accent, opacity: shown }}>{label}</div>
      ) : null}
      <div
        style={{
          opacity: shown,
          ...(backdrop
            ? { backgroundColor: editorial ? 'rgba(233, 225, 207, 0.9)' : theme.colors.surface, padding: '8px 26px 12px', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.18)' }
            : null),
        }}
      >
        <KineticText
          text={text}
          at={at + 2}
          stagger={editorial ? 1.1 : 1.2}
          rise={editorial ? 0.3 : 0.5}
          markerColor={theme.colors.highlight}
          markerInk={theme.colors.highlightInk}
          style={{
            fontFamily: theme.fonts.display,
            fontSize: editorial ? 58 : 56,
            fontWeight: editorial ? 600 : 800,
            lineHeight: 1.35,
            letterSpacing: editorial ? '0.04em' : '0.02em',
            color: theme.colors.ink,
            textAlign: 'center',
          }}
        />
      </div>
    </div>
  );
};
