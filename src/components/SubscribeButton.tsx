import React from 'react';
import { Bell, MousePointer2, ThumbsUp } from 'lucide-react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SPRINGS, springFrom } from '../animation/presets';
import { SUBSCRIBE_CLICK_OFFSET } from '../audio-events';

/**
 * 「チャンネル登録」ボタンのクリック演出。
 * カーソルが近づく → クリック → 「登録済み」に変わる → ベルが揺れる。
 * at はアニメーションの開始フレーム。
 */
export const SubscribeButton: React.FC<{ at: number; text: string; scale?: number; showLike?: boolean }> = ({
  at,
  text,
  scale = 1,
  showLike = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - at;
  const clickAt = SUBSCRIBE_CLICK_OFFSET;
  const subscribed = local >= clickAt + 2;

  // カーソル: 右下から近づいてクリックし、少し離れる
  const approach = springFrom(frame, at + 6, fps, SPRINGS.smooth);
  const leave = springFrom(frame, at + clickAt + 12, fps, SPRINGS.smooth);
  const cursorX = interpolate(approach, [0, 1], [220, 0]) + leave * 60;
  const cursorY = interpolate(approach, [0, 1], [140, 0]) + leave * 50;
  const press = interpolate(local, [clickAt - 2, clickAt, clickAt + 4], [1, 0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ripple = interpolate(local, [clickAt, clickAt + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bellSwing = subscribed ? Math.sin((local - clickAt) / 2.2) * 22 * Math.max(0, 1 - (local - clickAt) / 30) : 0;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 * scale, transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 34px',
          borderRadius: 999,
          backgroundColor: subscribed ? '#E5E5E5' : '#E62117',
          color: subscribed ? '#333333' : '#FFFFFF',
          fontSize: 28,
          fontWeight: 800,
          transform: `scale(${press})`,
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        {subscribed ? '登録済み' : text}
        {ripple > 0 && ripple < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              border: '4px solid #E62117',
              transform: `scale(${1 + ripple * 0.35})`,
              opacity: 1 - ripple,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
          transform: `rotate(${bellSwing}deg)`,
          transformOrigin: '50% 10%',
        }}
      >
        <Bell size={32} strokeWidth={2.4} color="#333333" fill={subscribed ? '#333333' : 'none'} />
      </div>
      {showLike ? (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
          }}
        >
          <ThumbsUp size={30} strokeWidth={2.4} color="#333333" fill={subscribed ? '#333333' : 'none'} />
        </div>
      ) : null}
      {/* カーソル */}
      <div
        style={{
          position: 'absolute',
          left: 150 + cursorX,
          top: 38 + cursorY,
          opacity: interpolate(local, [0, 6, clickAt + 26, clickAt + 34], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: `scale(${press})`,
          filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
        }}
      >
        <MousePointer2 size={46} strokeWidth={2} color="#111111" fill="#FFFFFF" />
      </div>
    </div>
  );
};
