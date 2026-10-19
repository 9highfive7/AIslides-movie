import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PAGE, useTheme } from '../themes';
import { SPRINGS, springFrom } from '../animation/presets';
import { SHORTS, useVertical } from '../stage';

/**
 * コンテンツシーンの補助装飾。
 * 左下の章タグ (例:「02 仕組み」) は下から、右上部のバッジは弾んで出現する。
 */
export const SceneChrome: React.FC<{ chapter?: string; badge?: string; at: number }> = ({
  chapter,
  badge,
  at,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chapterP = springFrom(frame, at + 8, fps, SPRINGS.snappy);
  const badgeP = springFrom(frame, at + 14, fps, SPRINGS.bouncy);
  const fade = (p: number) => interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
  // 縦の動画 (ショート): 章タグは出さず (左下は字幕・タイトルの場所)、バッジは上の UI のすぐ下の右に出す
  const vertical = useVertical();
  if (vertical) {
    chapter = undefined;
  }

  return (
    <>
      {chapter ? (
        <div
          style={{
            position: 'absolute',
            left: PAGE.paddingX,
            bottom: 216,
            border: `1.5px solid ${theme.colors.accent}`,
            borderRadius: 6,
            padding: '8px 18px',
            fontSize: 17,
            fontWeight: 700,
            color: theme.colors.accent,
            backgroundColor: theme.colors.surface,
            opacity: fade(chapterP),
            transform: `translateY(${(1 - chapterP) * 24}px)`,
          }}
        >
          {chapter}
        </div>
      ) : null}
      {badge ? (
        <div
          style={{
            position: 'absolute',
            right: vertical ? SHORTS.safe.right : PAGE.paddingX,
            top: vertical ? SHORTS.safe.top : 92,
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 19,
            fontWeight: 800,
            color: theme.colors.onAccent,
            backgroundColor: theme.colors.accent,
            opacity: fade(badgeP),
            transform: `scale(${badgeP}) rotate(${(1 - badgeP) * -12 + 3}deg)`,
          }}
        >
          {badge}
        </div>
      ) : null}
    </>
  );
};
