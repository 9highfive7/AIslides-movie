import React from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { useTheme } from '../themes';
import { ContentArea, type ContentOf } from './common';

/** 縦の箇条書きレイアウト。カードが左から順に滑り込む */
export const BulletsLayout: React.FC<{ content: ContentOf<'bullets'> }> = ({ content }) => {
  const theme = useTheme();
  return (
    <ContentArea>
      <div style={{ width: 1160, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="slideLeft">
            <div style={{ ...theme.card, padding: '26px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
              <IconBox name={item.icon} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{item.title}</div>
                {item.body ? (
                  <div style={{ fontSize: 17, lineHeight: 1.65, color: theme.colors.textSecondary, marginTop: 6 }}>
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
