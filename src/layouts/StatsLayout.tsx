import React from 'react';
import { Reveal } from '../components/Reveal';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type StatsScene = Extract<Scene, { layout: 'stats' }>;

/** 数字を強調するカードを横並びにしたレイアウト (2〜4枚) */
export const StatsLayout: React.FC<{
  content: StatsScene['content'];
  revealAt: RevealAt;
}> = ({ content, revealAt }) => {
  const count = Math.min(content.items.length, 4);

  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 240,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: `repeat(${count}, 1fr)`,
          gap: 28,
        }}
      >
        {content.items.map((item) => (
          <Reveal key={item.id} at={revealAt(item.id)}>
            <div
              style={{
                ...CARD,
                padding: '44px 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 700,
                  color: COLORS.accent,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 10 }}>{item.label}</div>
              {item.body ? (
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: COLORS.textSecondary,
                    marginTop: 12,
                  }}
                >
                  {item.body}
                </div>
              ) : null}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};
