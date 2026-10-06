import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { script, timeline } from '../data';
import { COLORS, SUBTITLE_FADE_FRAMES } from '../theme';

/**
 * 字幕レイヤー。各セリフの開始フレームで前の字幕と短く交差しながら切り替わる。
 * セリフ間の 0.3秒ギャップ中も直前の字幕が残るので点滅しない。
 * シーンのクロスフェードとは独立したレイヤーとして描画する。
 */
export const SubtitleLayer: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {timeline.scenes.map((ts) => {
        const scene = script.scenes.find((s) => s.id === ts.id);
        const onDark = scene?.layout === 'title';
        const sceneEnd = ts.startFrame + ts.durationFrames;

        return ts.lines.map((line, i) => {
          const next = ts.lines[i + 1];
          const inStart = line.startFrame;
          // 次のセリフの開始と交差してフェードアウト。最後のセリフはシーン末尾で引く
          const outStart = next ? next.startFrame - SUBTITLE_FADE_FRAMES : sceneEnd - 12;

          const opacity = interpolate(
            frame,
            [inStart, inStart + SUBTITLE_FADE_FRAMES, outStart, outStart + SUBTITLE_FADE_FRAMES],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );
          if (opacity <= 0) {
            return null;
          }

          return (
            <div
              key={`${ts.id}-${line.index}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 88,
                display: 'flex',
                justifyContent: 'center',
                opacity,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  maxWidth: 1480,
                  backgroundColor: COLORS.ink,
                  color: '#FFFFFF',
                  fontSize: 30,
                  fontWeight: 400,
                  lineHeight: 1.55,
                  padding: '16px 36px',
                  borderRadius: 8,
                  textAlign: 'center',
                  ...(onDark ? { border: `1px solid ${COLORS.onDarkLine}` } : null),
                }}
              >
                {line.text}
              </div>
            </div>
          );
        });
      })}
    </>
  );
};
