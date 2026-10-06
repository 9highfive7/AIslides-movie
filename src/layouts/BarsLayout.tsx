import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { Reveal } from '../components/Reveal';
import { CARD, COLORS, PAGE, REVEAL_FRAMES } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type BarsScene = Extract<Scene, { layout: 'bars' }>;

const BarRow: React.FC<{
  at: number | null;
  ratio: number;
  item: BarsScene['content']['items'][number];
}> = ({ at, ratio, item }) => {
  const frame = useCurrentFrame();
  const t =
    at === null
      ? 1
      : interpolate(frame, [at, at + REVEAL_FRAMES], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

  const fillColor = item.tone === 'warning' ? COLORS.warning : COLORS.accent;

  return (
    <div
      style={{
        ...CARD,
        padding: '22px 30px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ width: 300, fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{item.label}</div>
      <div
        style={{
          flex: 1,
          height: 30,
          borderRadius: 6,
          backgroundColor: 'rgba(15, 31, 61, 0.07)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(2, ratio * 100 * t)}%`,
            height: '100%',
            borderRadius: 6,
            backgroundColor: fillColor,
          }}
        />
      </div>
      <div
        style={{
          width: 110,
          textAlign: 'right',
          fontSize: 22,
          fontWeight: 700,
          color: fillColor,
          flexShrink: 0,
        }}
      >
        {item.display ?? item.value}
      </div>
    </div>
  );
};

/** 横棒グラフ風のスコア比較。バーが伸びる動きは出現時の1回だけ */
export const BarsLayout: React.FC<{ content: BarsScene['content']; revealAt: RevealAt }> = ({
  content,
  revealAt,
}) => {
  const max = Math.max(...content.items.map((item) => item.value), 1);

  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 240,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 1380, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {content.items.map((item) => (
          <BarRow key={item.id} at={revealAt(item.id)} ratio={item.value / max} item={item} />
        ))}
      </div>
      {content.caption ? (
        <Reveal at={revealAt('caption')} style={{ marginTop: 30 }}>
          <div style={{ fontSize: 17, color: COLORS.textSecondary }}>{content.caption}</div>
        </Reveal>
      ) : null}
    </div>
  );
};
