import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { script, timeline } from '../data';
import { SUBTITLE_FADE_FRAMES, useTheme } from '../themes';
import { RichText } from './RichText';

/**
 * 字幕レイヤー。各セリフの開始フレームで前の字幕と短く交差しながら切り替わる。
 * セリフ間の 0.3秒ギャップ中も直前の字幕が残るので点滅しない。
 * シーンのトランジションとは独立したレイヤーとして描画する。
 * **強調** はテーマの強調色で表示する。
 */
export const SubtitleLayer: React.FC<{ rightInset: number }> = ({ rightInset }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { subtitle } = script.meta;
  if (!subtitle.enabled) {
    return null;
  }
  const style = subtitle.style === 'auto' ? theme.subtitleStyle : subtitle.style;

  return (
    <>
      {timeline.scenes.map((ts) => {
        const sceneEnd = ts.startFrame + ts.durationFrames;
        if (frame < ts.startFrame || frame > sceneEnd + SUBTITLE_FADE_FRAMES) {
          return null;
        }

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
          const rise = interpolate(frame, [inStart, inStart + SUBTITLE_FADE_FRAMES + 2], [14, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={`${ts.id}-${line.index}`}
              style={{
                position: 'absolute',
                left: 0,
                right: rightInset,
                bottom: style === 'outline' ? 70 : 88,
                display: 'flex',
                justifyContent: 'center',
                opacity,
                transform: `translateY(${rise}px)`,
                pointerEvents: 'none',
              }}
            >
              {style === 'outline' ? (
                <div
                  style={{
                    maxWidth: 1560 - rightInset,
                    color: '#FFFFFF',
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1.4,
                    letterSpacing: '0.02em',
                    textAlign: 'center',
                    // 縁取りは文字の外側だけに描く (paint-order)。影で立体感を足す
                    WebkitTextStroke: `10px ${theme.colors.subtitleBg}`,
                    paintOrder: 'stroke fill',
                    textShadow: '0 6px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <RichText text={line.text} strongStyle={{ color: theme.colors.subtitleStrong }} />
                </div>
              ) : (
                <div
                  style={{
                    maxWidth: 1480 - rightInset,
                    backgroundColor: theme.colors.subtitleBg,
                    color: '#FFFFFF',
                    fontSize: 30,
                    fontWeight: 500,
                    lineHeight: 1.55,
                    padding: '16px 36px',
                    borderRadius: theme.radius,
                    textAlign: 'center',
                    border: `1px solid ${theme.colors.onDarkLine}`,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                  }}
                >
                  <RichText
                    text={line.text}
                    strongStyle={{ color: theme.colors.subtitleStrong, fontWeight: 800 }}
                  />
                </div>
              )}
            </div>
          );
        });
      })}
    </>
  );
};
