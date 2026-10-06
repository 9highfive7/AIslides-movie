import React from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type BulletsScene = Extract<Scene, { layout: 'bullets' }>;

/** 縦の箇条書きレイアウト。白背景カードを縦に積む */
export const BulletsLayout: React.FC<{
  content: BulletsScene['content'];
  revealAt: RevealAt;
}> = ({ content, revealAt }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 1160, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {content.items.map((item) => (
          <Reveal key={item.id} at={revealAt(item.id)}>
            <div
              style={{
                ...CARD,
                padding: '26px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <IconBox name={item.icon} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 23, fontWeight: 700 }}>{item.title}</div>
                {item.body ? (
                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.65,
                      color: COLORS.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    {item.body}
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
};
