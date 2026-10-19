import React from 'react';
import { Check } from 'lucide-react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';
import { useVertical } from '../stage';

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
        width: 52,
        height: 52,
        borderRadius: 11,
        border: `2.5px solid ${theme.colors.accent}`,
        backgroundColor: filled ? theme.colors.accent : theme.colors.accentSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ transform: `scale(${p})` }}>
        <Check size={34} strokeWidth={3.2} color={filled ? theme.colors.onAccent : theme.colors.accent} />
      </div>
    </div>
  );
};

/** 番号付きチェックリスト。カードが出た直後にチェックが付く */
export const ChecklistLayout: React.FC<{ content: ContentOf<'checklist'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  // スマホでも読める大きさにする。4つ並ぶときは字幕にかからないよう少し詰める
  const compact = content.items.length >= 4;
  const vertical = useVertical();

  return (
    <ContentArea>
      <div style={{ width: vertical ? '100%' : 1280, display: 'flex', flexDirection: 'column', gap: compact ? 16 : vertical ? 20 : 26 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="slideLeft">
            <div
              style={{ ...theme.card, padding: compact ? (vertical ? '16px 22px' : '18px 32px') : vertical ? '22px 24px' : '28px 36px', display: 'flex', alignItems: 'center', gap: vertical ? 18 : 28 }}
            >
              <div style={{ fontSize: vertical ? 32 : 38, fontWeight: 900, color: theme.colors.accent, width: vertical ? 52 : 68, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <CheckMark at={ctx.appearAt(item.id, i)} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: compact ? 31 : 36, fontWeight: 800, lineHeight: 1.35 }}>{item.text}</div>
                {item.note ? (
                  <div style={{ fontSize: compact ? 21 : 24, lineHeight: 1.45, color: theme.colors.textSecondary, marginTop: compact ? 2 : 6 }}>
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
