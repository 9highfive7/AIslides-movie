import React from 'react';
import { Play } from 'lucide-react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { KineticText } from '../components/KineticText';
import { SubscribeButton } from '../components/SubscribeButton';
import { OUTRO_SUBSCRIBE_DELAY } from '../audio-events';
import type { ContentOf } from './common';
import { useVertical } from '../stage';

/**
 * エンディング。お礼の一言 + 登録ボタンのクリック演出 +
 * YouTube の終了画面 (関連動画カード) を置くための枠。
 */
export const OutroLayout: React.FC<{ content: ContentOf<'outro'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const msgP = springFrom(frame, introAt + 16, fps, SPRINGS.snappy);
  // ショート (縦の動画) には終了画面 (関連動画のカード) がないので、枠は出さずに中央にまとめる
  const vertical = useVertical();
  const endScreen = content.endScreen && !vertical;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: endScreen ? 'flex-start' : 'center',
        paddingTop: endScreen ? 110 : 0,
        paddingBottom: endScreen ? 0 : vertical ? 300 : 160,
        paddingLeft: vertical ? 80 : 0,
        paddingRight: vertical ? 120 : 0,
      }}
    >
      <KineticText
        text={content.title}
        at={introAt + 4}
        stagger={1.5}
        markerColor={theme.colors.darkHighlight}
        markerInk={theme.colors.darkHighlightInk}
        marker="block"
        style={{ fontSize: endScreen ? 56 : 72, fontWeight: 900, color: theme.colors.onDark, textAlign: 'center' }}
      />
      {content.message ? (
        <div
          style={{
            marginTop: 18,
            fontSize: 25,
            color: theme.colors.onDarkSecondary,
            opacity: msgP,
            transform: `translateY(${(1 - msgP) * 16}px)`,
          }}
        >
          {content.message}
        </div>
      ) : null}
      {endScreen ? (
        <div style={{ display: 'flex', gap: 60, marginTop: 50 }}>
          {['おすすめ動画', '次の動画'].map((label, i) => {
            const p = springFrom(frame, introAt + 12 + i * 6, fps, SPRINGS.bouncy);
            return (
              <div
                key={label}
                style={{
                  width: 560,
                  height: 315,
                  borderRadius: 18,
                  border: `3px dashed ${theme.colors.onDarkLine}`,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                  color: theme.colors.onDarkSecondary,
                  fontSize: 22,
                  fontWeight: 700,
                  opacity: Math.min(1, p * 1.5),
                  transform: `scale(${0.7 + 0.3 * p})`,
                }}
              >
                <Play size={54} strokeWidth={1.75} color={theme.colors.onDarkSecondary} />
                {label}
              </div>
            );
          })}
        </div>
      ) : null}
      {content.subscribe ? (
        <div style={{ marginTop: endScreen ? 44 : 60, marginLeft: vertical ? 0 : 120 }}>
          <SubscribeButton at={introAt + OUTRO_SUBSCRIBE_DELAY} text="チャンネル登録" scale={1.15} showLike />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
