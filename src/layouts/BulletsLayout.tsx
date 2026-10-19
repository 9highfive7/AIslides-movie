import React from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { useTheme } from '../themes';
import { ContentArea, type ContentOf } from './common';
import { useVertical } from '../stage';

/** 縦の箇条書きレイアウト。カードが左から順に滑り込む */
export const BulletsLayout: React.FC<{ content: ContentOf<'bullets'> }> = ({ content }) => {
  const theme = useTheme();
  const vertical = useVertical();
  return (
    <ContentArea>
      <div style={{ width: vertical ? '100%' : 1160, display: 'flex', flexDirection: 'column', gap: vertical ? 18 : 24 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="slideLeft">
            <div style={{ ...theme.card, padding: vertical ? '20px 24px' : '26px 32px', display: 'flex', alignItems: 'center', gap: vertical ? 18 : 24 }}>
              <IconBox name={item.icon} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: vertical ? 27 : 24, fontWeight: 800 }}>{item.title}</div>
                {item.body ? (
                  <div style={{ fontSize: vertical ? 19 : 17, lineHeight: 1.65, color: theme.colors.textSecondary, marginTop: 6 }}>
                    {item.body}
                  </div>
                ) : null}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </ContentArea>
  );
};
