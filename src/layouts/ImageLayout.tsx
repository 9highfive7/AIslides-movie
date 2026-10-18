import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Reveal } from '../components/Reveal';
import { PAGE, useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import type { ContentOf } from './common';

/**
 * 画像を大きく見せるレイアウト。画像はシーンの間ゆっくりズーム＆パンする (ケン・バーンズ効果)。
 * reveal 要素: "image" と "caption"。
 */
export const ImageLayout: React.FC<{ content: ContentOf<'image'>; hasHeading: boolean }> = ({ content, hasHeading }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { ts } = useSceneContext();
  const src = /^https?:\/\//.test(content.src) ? content.src : staticFile(content.src);
  const kb = interpolate(frame, [ts.startFrame, ts.startFrame + ts.durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: hasHeading ? PAGE.contentTop - 30 : 80,
        bottom: 210,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <Reveal id="image" order={0} preset="zoom" style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            ...theme.card,
            height: '100%',
            aspectRatio: '16 / 9',
            maxWidth: '100%',
            overflow: 'hidden',
            padding: 0,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Img
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: content.fit,
              transform: `scale(${1 + kb * 0.08}) translateX(${kb * -1.5}%)`,
            }}
          />
        </div>
      </Reveal>
      {content.caption ? (
        <Reveal id="caption" order={2} preset="fadeUp">
          <div style={{ fontSize: 20, color: theme.colors.textSecondary }}>{content.caption}</div>
        </Reveal>
      ) : null}
    </div>
  );
};
