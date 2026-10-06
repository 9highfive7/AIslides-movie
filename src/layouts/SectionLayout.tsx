import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../theme';
import type { Scene } from '../schemas';

type SectionScene = Extract<Scene, { layout: 'section' }>;

/** 章扉 (セクション区切り)。濃紺背景に章番号と章タイトル */
export const SectionLayout: React.FC<{ scene: SectionScene }> = ({ scene }) => {
  const { number, title, subtitle } = scene.content;

  return (
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
            fontSize: 120,
            fontWeight: 700,
            color: COLORS.accentOnDark,
            letterSpacing: '0.06em',
            lineHeight: 1,
            marginBottom: 18,
          }}
        >
          {number}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 54,
          fontWeight: 700,
          color: '#FFFFFF',
          textAlign: 'center',
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: 56,
          height: 3,
          borderRadius: 2,
          backgroundColor: COLORS.accentOnDark,
          margin: '30px 0',
        }}
      />
      {subtitle ? (
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: COLORS.onDarkSecondary,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
