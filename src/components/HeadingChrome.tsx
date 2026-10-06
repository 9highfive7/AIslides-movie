import React from 'react';
import { COLORS, PAGE } from '../theme';

/**
 * コンテンツシーン用の見出し。左上に配置し、
 * 上に字間広めの英字ラベル (アクセント色)、下に短い下線を添える。
 */
export const HeadingChrome: React.FC<{ heading: string; label?: string }> = ({
  heading,
  label,
}) => {
  return (
    <div style={{ position: 'absolute', left: PAGE.paddingX, top: 84 }}>
      {label ? (
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: COLORS.accent,
          }}
        >
          {label}
        </div>
      ) : null}
      <h1
        style={{
          margin: '12px 0 0',
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: COLORS.ink,
        }}
      >
        {heading}
      </h1>
      <div
        style={{
          width: 56,
          height: 4,
          borderRadius: 2,
          backgroundColor: COLORS.accent,
          marginTop: 20,
        }}
      />
    </div>
  );
};
