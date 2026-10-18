import React from 'react';
import { Crown } from 'lucide-react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

const MEDAL: Record<number, string> = { 1: '#E8A800', 2: '#9AA5B1', 3: '#C0773A' };

/**
 * ランキング。上から 1位, 2位, ... の順に並ぶ。
 * reveal を書かない場合は下位から順に出現し、1位は王冠と光の帯で強調される。
 */
export const RankingLayout: React.FC<{ content: ContentOf<'ranking'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const items = content.items
    .map((item, i) => ({ ...item, rank: item.rank ?? i + 1 }))
    .sort((a, b) => a.rank - b.rank);
  const compact = items.length >= 5;

  return (
    <ContentArea>
      <div style={{ width: 1240, display: 'flex', flexDirection: 'column', gap: compact ? 14 : 20 }}>
        {items.map((item, i) => {
          const order = (items.length - 1 - i) * 2; // 下位から順に
          const at = ctx.appearAt(item.id, order);
          const isTop = item.rank === 1;
          const color = MEDAL[item.rank] ?? theme.colors.accent;
          const crownP = springFrom(frame, at + 10, fps, SPRINGS.bouncy);
          const shine = interpolate(frame, [at + 14, at + 40], [-30, 130], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <Reveal key={item.id} id={item.id} order={order} preset="slideRight">
              <div
                style={{
                  ...theme.card,
                  ...(isTop ? { border: `3px solid ${color}`, boxShadow: `0 0 0 6px ${color}33` } : null),
                  position: 'relative',
                  overflow: 'hidden',
                  padding: compact ? '16px 28px' : '22px 30px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: compact ? 66 : 76,
                      height: compact ? 66 : 76,
                      borderRadius: '50%',
                      backgroundColor: color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      paddingTop: compact ? 10 : 14,
                      fontWeight: 900,
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: compact ? 34 : 40 }}>{item.rank}</span>
                    <span style={{ fontSize: 16, marginLeft: 2 }}>位</span>
                  </div>
                </div>
                {item.icon ? <IconBox name={item.icon} size={compact ? 52 : 60} /> : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: isTop ? 28 : 24, fontWeight: 900 }}>{item.title}</div>
                  {item.body ? (
                    <div style={{ fontSize: 16, lineHeight: 1.6, color: theme.colors.textSecondary, marginTop: 4 }}>
                      {item.body}
                    </div>
                  ) : null}
                </div>
                {isTop ? (
                  <>
                    <div style={{ transform: `scale(${crownP}) rotate(${(1 - crownP) * 40 - 12}deg)` }}>
                      <Crown size={54} strokeWidth={2} color={color} fill={`${color}55`} />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${shine}%`,
                        width: 120,
                        background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)',
                        pointerEvents: 'none',
                      }}
                    />
                  </>
                ) : null}
              </div>
            </Reveal>
          );
        })}
      </div>
    </ContentArea>
  );
};
