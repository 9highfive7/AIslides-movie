import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { CountUp } from '../components/CountUp';
import { useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

type BarItem = ContentOf<'bars'>['items'][number];

const BarRow: React.FC<{ item: BarItem; ratio: number; order: number }> = ({ item, ratio, order }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const at = ctx.appearAt(item.id, order);
  // カードが出てから少し遅れてバーが伸びる
  const grow = springFrom(frame, at + 6, fps, SPRINGS.smooth);
  const fillColor = item.tone === 'warning' ? theme.colors.warning : theme.colors.accent;

  return (
    <Reveal id={item.id} order={order} preset="fadeUp">
      <div style={{ ...theme.card, padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ width: 300, fontSize: 21, fontWeight: 800, flexShrink: 0 }}>{item.label}</div>
        <div style={{ flex: 1, height: 34, borderRadius: theme.radius, backgroundColor: theme.colors.track, overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.max(1, ratio * 100 * grow)}%`,
              height: '100%',
              borderRadius: theme.radius,
              backgroundColor: fillColor,
            }}
          />
        </div>
        <div
          style={{
            width: 130,
            textAlign: 'right',
            fontSize: 26,
            fontWeight: 900,
            color: fillColor,
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <CountUp value={item.display ?? String(item.value)} frame={frame} at={at + 6} durationFrames={30} />
        </div>
      </div>
    </Reveal>
  );
};

/** 横棒グラフ風のスコア比較。バーが伸び、数値がカウントアップする */
export const BarsLayout: React.FC<{ content: ContentOf<'bars'> }> = ({ content }) => {
  const theme = useTheme();
  const max = Math.max(...content.items.map((item) => item.value), 1);

  return (
    <ContentArea bottom={240} style={{ flexDirection: 'column' }}>
      <div style={{ width: 1380, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {content.items.map((item, i) => (
          <BarRow key={item.id} item={item} ratio={item.value / max} order={i} />
        ))}
      </div>
      {content.caption ? (
        <Reveal id="caption" order={content.items.length} style={{ marginTop: 30 }}>
          <div style={{ fontSize: 18, color: theme.colors.textSecondary }}>{content.caption}</div>
        </Reveal>
      ) : null}
    </ContentArea>
  );
};
