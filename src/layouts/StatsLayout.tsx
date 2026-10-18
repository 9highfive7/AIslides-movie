import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Reveal } from '../components/Reveal';
import { CountUp } from '../components/CountUp';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { ContentArea, type ContentOf } from './common';

/** 数字を強調するカードを横並びにしたレイアウト (2〜4枚)。数字は 0 からカウントアップする */
export const StatsLayout: React.FC<{ content: ContentOf<'stats'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  const frame = useCurrentFrame();
  const count = Math.min(content.items.length, 4);

  return (
    <ContentArea bottom={240}>
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 32 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="pop">
            <div style={{ ...theme.card, padding: '46px 32px', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: theme.colors.accent,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <CountUp value={item.value} frame={frame} at={ctx.appearAt(item.id, i)} />
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, marginTop: 12 }}>{item.label}</div>
              {item.body ? (
                <div style={{ fontSize: 16, lineHeight: 1.6, color: theme.colors.textSecondary, marginTop: 12 }}>
                  {item.body}
                </div>
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </ContentArea>
  );
};
