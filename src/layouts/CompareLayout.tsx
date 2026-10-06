import React from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type CompareScene = Extract<Scene, { layout: 'compare' }>;

const Column: React.FC<{
  title: string;
  items: CompareScene['content']['left'];
  revealAt: RevealAt;
}> = ({ title, items, revealAt }) => {
  return (
    <div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: COLORS.textSecondary,
          marginBottom: 22,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.map((item) => (
          <Reveal key={item.id} at={revealAt(item.id)}>
            <div
              style={{
                ...CARD,
                ...(item.tone === 'warning' ? { borderLeft: `3px solid ${COLORS.warning}` } : null),
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 22,
              }}
            >
              <IconBox name={item.icon} tone={item.tone === 'warning' ? 'warning' : 'accent'} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{item.title}</div>
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

/** 左右比較レイアウト。カードは各項目の id で reveal する */
export const CompareLayout: React.FC<{ content: CompareScene['content']; revealAt: RevealAt }> = ({
  content,
  revealAt,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 220,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 56,
        alignItems: 'start',
      }}
    >
      <Column title={content.leftTitle} items={content.left} revealAt={revealAt} />
      <Column title={content.rightTitle} items={content.right} revealAt={revealAt} />
    </div>
  );
};
