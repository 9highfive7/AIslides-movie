import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { script, timeline } from '../data';
import { SPRINGS, springFrom } from '../animation/presets';
import { SUBSCRIBE_POPUP_DELAY, SUBSCRIBE_POPUP_FRAMES } from '../audio-events';
import { SubscribeButton } from './SubscribeButton';

/** 動画の途中で出す「チャンネル登録」ポップアップ (meta.subscribePopup) */
export const SubscribePopup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const popup = script.meta.subscribePopup;
  const ts = popup ? timeline.scenes.find((s) => s.id === popup.sceneId) : undefined;
  if (!popup || !ts) {
    return null;
  }

  const start = ts.startFrame + SUBSCRIBE_POPUP_DELAY;
  const end = start + SUBSCRIBE_POPUP_FRAMES;
  if (frame < start || frame > end + 20) {
    return null;
  }
  const enter = springFrom(frame, start, fps, SPRINGS.snappy);
  const exit = interpolate(frame, [end - 12, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 60,
        padding: '22px 28px',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.96)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        transform: `translateX(${(1 - enter) * 600 + exit * 600}px)`,
      }}
    >
      <SubscribeButton at={start} text={popup.text} scale={0.9} showLike />
    </div>
  );
};
