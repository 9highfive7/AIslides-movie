import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { script, timeline } from '../data';
import { SUBTITLE_FADE_FRAMES, useTheme } from '../themes';
import { RichText } from './RichText';
import { SHORTS, useVertical } from '../stage';

/**
 * 字幕レイヤー。各セリフの開始フレームで前の字幕と短く交差しながら切り替わる。
 * セリフ間の 0.3秒ギャップ中も直前の字幕が残るので点滅しない。
 * シーンのトランジションとは独立したレイヤーとして描画する。
 * **強調** はテーマの強調色で表示する。
 */
export const SubtitleLayer: React.FC<{ rightInset: number }> = ({ rightInset }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const vertical = useVertical();
  const { subtitle } = script.meta;
  if (!subtitle.enabled) {
    return null;
  }
  const style = subtitle.style === 'auto' ? theme.subtitleStyle : subtitle.style;
  // 縦の動画 (ショート) では、下のタイトル・説明と右のボタンにかからない位置に、大きめに出す
  const place: React.CSSProperties = vertical
    ? { left: SHORTS.safe.left, right: SHORTS.safe.right, bottom: SHORTS.safe.bottom }
    : { left: 0, right: rightInset, bottom: style === 'outline' ? 70 : 88 };
  const maxWidth = vertical
    ? SHORTS.width - SHORTS.safe.left - SHORTS.safe.right
    : style === 'outline'
      ? 1560 - rightInset
      : 1600 - rightInset;

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
                ...place,
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
                    maxWidth,
                    color: '#FFFFFF',
                    fontSize: vertical ? 54 : 44,
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
                    maxWidth,
                    backgroundColor: theme.colors.subtitleBg,
                    color: '#FFFFFF',
                    fontSize: vertical ? 44 : theme.chrome === 'editorial' ? 38 : 34,
                    fontWeight: theme.chrome === 'editorial' ? 700 : 500,
                    lineHeight: 1.55,
                    padding: vertical ? '14px 28px' : '14px 36px',
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
