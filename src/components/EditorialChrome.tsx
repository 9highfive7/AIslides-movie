import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../themes';
import { SPRINGS, springFrom } from '../animation/presets';

/**
 * editorial なテーマ (paper) の飾り。
 * 雑誌の「柱」のように、左上へ小さく「図解 No.01 半導体の回路を焼く機械」を出し続ける。
 * シーンをまたいで同じ位置に残るので、トランジションとは独立したレイヤーに置く。
 */
export const RunningHead: React.FC<{ label?: string; title?: string }> = ({ label, title }) => {
  const theme = useTheme();
  if (!label && !title) {
    return null;
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 34,
        display: 'flex',
        gap: 14,
        alignItems: 'baseline',
        fontFamily: theme.fonts.display,
        fontSize: 19,
        fontWeight: 700,
        color: theme.colors.ink,
        // 3D の場面など、背景が紙でないときも読めるように紙色の下地を敷く
        backgroundColor: theme.colors.bg,
        padding: '4px 8px 6px',
        borderBottom: `1.5px solid ${theme.colors.ink}`,
      }}
    >
      {label ? <span>{label}</span> : null}
      {title ? <span>{title}</span> : null}
    </div>
  );
};

/** 画面上部中央に明朝で出す見出し (例: "世界の半導体シェア（1988年）")。ふわっと下りてくる */
export const EditorialHeading: React.FC<{ heading: string; at: number }> = ({ heading, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springFrom(frame, at + 2, fps, SPRINGS.smooth);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 150,
        textAlign: 'center',
        fontFamily: theme.fonts.display,
        fontSize: 46,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: theme.colors.ink,
        opacity: interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${(1 - p) * -16}px)`,
      }}
    >
      {heading}
    </div>
  );
};
