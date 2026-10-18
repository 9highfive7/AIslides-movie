import React from 'react';
import { Check } from 'lucide-react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

const CheckMark: React.FC<{ at: number }> = ({ at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // カードが出た後にチェックが「ポン」と付く
  const p = springFrom(frame, at + 10, fps, SPRINGS.bouncy);
  const filled = p > 0.5;

  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 9,
        border: `2.5px solid ${theme.colors.accent}`,
        backgroundColor: filled ? theme.colors.accent : theme.colors.accentSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ transform: `scale(${p})` }}>
        <Check size={26} strokeWidth={3.2} color={filled ? theme.colors.onAccent : theme.colors.accent} />
      </div>
    </div>
  );
};

/** 番号付きチェックリスト。カードが出た直後にチェックが付く */
export const ChecklistLayout: React.FC<{ content: ContentOf<'checklist'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();

  return (
    <ContentArea>
      <div style={{ width: 1160, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="slideLeft">
            <div style={{ ...theme.card, padding: '24px 30px', display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: theme.colors.accent, width: 56, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <CheckMark at={ctx.appearAt(item.id, i)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 23, fontWeight: 800 }}>{item.text}</div>
                {item.note ? (
                  <div style={{ fontSize: 16, lineHeight: 1.6, color: theme.colors.textSecondary, marginTop: 4 }}>
                    {item.note}
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
