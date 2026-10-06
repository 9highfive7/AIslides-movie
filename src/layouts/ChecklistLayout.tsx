import React from 'react';
import { Check } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type ChecklistScene = Extract<Scene, { layout: 'checklist' }>;

/** 番号付きチェックリスト。導入前の確認項目などに使う */
export const ChecklistLayout: React.FC<{
  content: ChecklistScene['content'];
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
      <div style={{ width: 1160, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} at={revealAt(item.id)}>
            <div
              style={{
                ...CARD,
                padding: '24px 30px',
                display: 'flex',
                alignItems: 'center',
                gap: 26,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: COLORS.accent,
                  width: 56,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 7,
                  border: `2px solid ${COLORS.accentBorder}`,
                  backgroundColor: COLORS.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={20} strokeWidth={2.5} color={COLORS.accent} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{item.text}</div>
                {item.note ? (
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: COLORS.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {item.note}
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
