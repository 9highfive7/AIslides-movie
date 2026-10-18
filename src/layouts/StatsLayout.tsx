import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { CountUp } from '../components/CountUp';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

type StatItem = ContentOf<'stats'>['items'][number];

/** 標準のカード: 中央揃えで大きな数字 */
const StandardCard: React.FC<{ item: StatItem; at: number }> = ({ item, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const color = item.tone === 'warning' ? theme.colors.warning : theme.colors.accent;
  return (
    <div style={{ ...theme.card, padding: '46px 32px', textAlign: 'center' }}>
      {item.kicker ? (
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.textSecondary, marginBottom: 10 }}>
          {item.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <CountUp value={item.value} frame={frame} at={at} />
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 12 }}>{item.label}</div>
      {item.body ? (
        <div style={{ fontSize: 16, lineHeight: 1.6, color: theme.colors.textSecondary, marginTop: 12 }}>
          {item.body}
        </div>
      ) : null}
      {item.note ? (
        <div style={{ fontSize: 13, color: theme.colors.textFaint, marginTop: 16 }}>{item.note}</div>
      ) : null}
    </div>
  );
};

/**
 * editorial (paper) のカード: 枠線だけの紙のカードに、左揃えの小見出し・明朝の数字・注記。
 * tone: warning は朱色の枠と数字、stamp は右下に「判子」のような丸印を押す。
 */
const EditorialCard: React.FC<{ item: StatItem; at: number }> = ({ item, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const warn = item.tone === 'warning';
  const color = warn ? theme.colors.warning : theme.colors.ink;
  const stampP = springFrom(frame, at + 22, fps, SPRINGS.bouncy);

  return (
    <div
      style={{
        ...theme.card,
        borderColor: warn ? theme.colors.warning : theme.colors.ink,
        position: 'relative',
        height: 380,
        padding: '26px 30px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {item.kicker ? (
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: 20,
            fontWeight: 600,
            color: theme.colors.textSecondary,
            paddingBottom: 6,
            borderBottom: `1px solid ${theme.colors.line}`,
            alignSelf: 'flex-start',
          }}
        >
          {item.kicker}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: theme.fonts.display,
          fontSize: 74,
          fontWeight: 600,
          color,
          lineHeight: 1.1,
          marginTop: 30,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <CountUp value={item.value} frame={frame} at={at} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 18 }}>{item.label}</div>
      {item.body ? (
        <div style={{ fontSize: 18, lineHeight: 1.6, color: theme.colors.textSecondary, marginTop: 8 }}>{item.body}</div>
      ) : null}
      <div style={{ flex: 1 }} />
      {item.note ? <div style={{ fontSize: 14, color: theme.colors.textFaint }}>{item.note}</div> : null}
      {item.stamp ? (
        <div
          style={{
            position: 'absolute',
            right: 26,
            bottom: 26,
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: theme.colors.warning,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            opacity: Math.min(1, stampP * 2),
            transform: `scale(${1.6 - 0.6 * stampP}) rotate(${(1 - stampP) * -20}deg)`,
          }}
        >
          {item.stamp}
        </div>
      ) : null}
    </div>
  );
};

/** 数字を強調するカードを横並びにしたレイアウト (2〜4枚)。数字は 0 からカウントアップする */
export const StatsLayout: React.FC<{ content: ContentOf<'stats'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  const count = Math.min(content.items.length, 4);
  const Card = theme.chrome === 'editorial' ? EditorialCard : StandardCard;

  return (
    <ContentArea bottom={240}>
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 32 }}>
        {content.items.map((item, i) => (
          <Reveal key={item.id} id={item.id} order={i} preset="pop">
            <Card item={item} at={ctx.appearAt(item.id, i)} />
          </Reveal>
        ))}
      </div>
    </ContentArea>
  );
};
