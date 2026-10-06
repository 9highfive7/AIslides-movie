import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme';
import type { Scene } from '../schemas';

type TitleScene = Extract<Scene, { layout: 'title' }>;

/** タイトルシーン。濃紺背景 + 白文字。中央に大きく構える */
export const TitleLayout: React.FC<{ scene: TitleScene }> = ({ scene }) => {
  const { kicker, title, subtitle } = scene.content;

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
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '0.34em',
            color: COLORS.accentOnDark,
            marginBottom: 34,
          }}
        >
          {kicker}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#FFFFFF',
          lineHeight: 1.3,
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: 64,
          height: 3,
          borderRadius: 2,
          backgroundColor: COLORS.accentOnDark,
          margin: '36px 0',
        }}
      />
      {subtitle ? (
        <div
          style={{
            fontSize: 25,
            fontWeight: 400,
            color: COLORS.onDarkSecondary,
            textAlign: 'center',
            lineHeight: 1.7,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
