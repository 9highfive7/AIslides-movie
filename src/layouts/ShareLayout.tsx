import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

/**
 * 1本の帯を区切って割合を見せる「シェア」のグラフ (帯グラフ)。
 * 最初は空の枠だけが出て、各区分は reveal されたときに左から順に伸びる。
 * reveal 要素: 各 segment の id と "source"。
 */
export const ShareLayout: React.FC<{ content: ContentOf<'share'>; hasHeading: boolean }> = ({ content, hasHeading }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const total = content.segments.reduce((sum, seg) => sum + seg.value, 0);
  const frameAt = ctx.appearAt(null, 0);

  const colorOf = (tone: ContentOf<'share'>['segments'][number]['tone']): string =>
    tone === 'warning' ? theme.colors.warning : tone === 'accent' ? theme.colors.accent : theme.colors.textFaint;

  return (
    <ContentArea bottom={260} style={{ flexDirection: 'column', alignItems: 'stretch', top: hasHeading ? 300 : 200 }}>
      {content.title ? (
        <div
          style={{
            textAlign: 'center',
            fontFamily: theme.fonts.display,
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: 56,
          }}
        >
          {content.title}
        </div>
      ) : null}
      <div
        style={{
          alignSelf: 'center',
          width: 1300,
          height: 150,
          border: `2px solid ${theme.colors.ink}`,
          backgroundColor: theme.colors.track,
          padding: 6,
          display: 'flex',
          opacity: interpolate(frame, [frameAt - 6, frameAt + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        {content.segments.map((seg, i) => {
          const at = ctx.appearAt(seg.id, i + 1);
          const grow = springFrom(frame, at, fps, SPRINGS.smooth);
          const textP = interpolate(grow, [0.55, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div
              key={seg.id}
              style={{
                width: `${(seg.value / total) * 100 * grow}%`,
                height: '100%',
                backgroundColor: colorOf(seg.tone),
                color: '#FFFFFF',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                padding: '0 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                // 区分の境目に細い紙色の線を入れる
                borderLeft: i > 0 && grow > 0.01 ? `3px solid ${theme.colors.track}` : undefined,
              }}
            >
              <div style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.1, opacity: textP }}>{seg.display}</div>
              {seg.label ? (
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, opacity: textP }}>{seg.label}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      {content.source ? (
        <Reveal id="source" order={content.segments.length + 1} style={{ alignSelf: 'center', width: 1300, marginTop: 18 }}>
          <div style={{ fontSize: 16, color: theme.colors.textSecondary }}>※ {content.source}</div>
        </Reveal>
      ) : null}
    </ContentArea>
  );
};
