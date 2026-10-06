import React from 'react';
import { COLORS, PAGE } from '../theme';

/**
 * コンテンツシーンの補助装飾。
 * 左下の章タグ (reference動画の「02 仕組み」相当) と右上部のバッジ。
 */
export const SceneChrome: React.FC<{ chapter?: string; badge?: string }> = ({
  chapter,
  badge,
}) => {
  return (
    <>
      {chapter ? (
        <div
          style={{
            position: 'absolute',
            left: PAGE.paddingX,
            bottom: 216,
            border: `1.5px solid ${COLORS.accent}`,
            borderRadius: 6,
            padding: '8px 18px',
            fontSize: 17,
            fontWeight: 700,
            color: COLORS.accent,
            backgroundColor: '#FFFFFF',
          }}
        >
          {chapter}
        </div>
      ) : null}
      {badge ? (
        <div
          style={{
            position: 'absolute',
            right: PAGE.paddingX,
            top: 92,
            borderRadius: 6,
            padding: '8px 18px',
            fontSize: 17,
            fontWeight: 700,
            color: COLORS.accent,
            backgroundColor: COLORS.accentSoft,
            border: `1px solid ${COLORS.accentBorder}`,
          }}
        >
          {badge}
        </div>
      ) : null}
    </>
  );
};
