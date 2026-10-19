import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';
import { useVertical } from '../stage';

const Column: React.FC<{
  title: string;
  items: ContentOf<'compare'>['left'];
  side: 'left' | 'right';
}> = ({ title, items, side }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const titleP = springFrom(frame, introAt + 4, fps, SPRINGS.snappy);
  const vertical = useVertical();

  return (
    <div style={{ flex: vertical ? undefined : 1, minWidth: 0, width: vertical ? '100%' : undefined }}>
      <div
        style={{
          fontSize: vertical ? 22 : 19,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: theme.colors.textSecondary,
          marginBottom: vertical ? 12 : 22,
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * -16}px)`,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: vertical ? 12 : 22 }}>
        {items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i + 1} preset={side === 'left' ? 'slideLeft' : 'slideRight'}>
            <div
              style={{
                ...theme.card,
                ...(item.tone === 'warning' ? { borderLeft: `6px solid ${theme.colors.warning}` } : null),
                padding: vertical ? '16px 22px' : '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: vertical ? 18 : 22,
              }}
            >
              <IconBox name={item.icon} tone={item.tone === 'warning' ? 'warning' : 'accent'} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 23, fontWeight: 800 }}>{item.title}</div>
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
    </div>
  );
};

/** 左右比較レイアウト。中央に線が伸び、「VS」が弾んで出る */
export const CompareLayout: React.FC<{ content: ContentOf<'compare'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const lineP = springFrom(frame, introAt + 2, fps, SPRINGS.smooth);
  const vsP = springFrom(frame, introAt + 10, fps, SPRINGS.bouncy);
  const vertical = useVertical();

  // 縦の動画 (ショート): 上と下にくらべる物を置き、間に横線と「VS」を出す
  if (vertical) {
    return (
      <ContentArea style={{ flexDirection: 'column', gap: 10 }}>
        <Column title={content.leftTitle} items={content.left} side="left" />
        <div style={{ position: 'relative', width: '100%', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', height: 3, borderRadius: 2, backgroundColor: theme.colors.line, transform: `scaleX(${lineP})` }} />
          <div
            style={{
              position: 'absolute',
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: theme.colors.ink,
              color: theme.colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 900,
              fontStyle: 'italic',
              opacity: interpolate(vsP, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `scale(${vsP}) rotate(${(1 - vsP) * -90}deg)`,
            }}
          >
            VS
          </div>
        </div>
        <Column title={content.rightTitle} items={content.right} side="right" />
      </ContentArea>
    );
  }

  return (
    <ContentArea style={{ alignItems: 'flex-start', gap: 40 }}>
      <Column title={content.leftTitle} items={content.left} side="left" />
      <div style={{ position: 'relative', width: 72, alignSelf: 'stretch', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 3,
            height: '100%',
            borderRadius: 2,
            backgroundColor: theme.colors.line,
            transform: `scaleY(${lineP})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '42%',
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: theme.colors.ink,
            color: theme.colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            fontWeight: 900,
            fontStyle: 'italic',
            opacity: interpolate(vsP, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${vsP}) rotate(${(1 - vsP) * -90}deg)`,
          }}
        >
          VS
        </div>
      </div>
      <Column title={content.rightTitle} items={content.right} side="right" />
    </ContentArea>
  );
};
