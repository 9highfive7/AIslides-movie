import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { useTheme, type Theme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { ContentArea, type ContentOf } from './common';

const cellStyle = (theme: Theme, tone: 'normal' | 'good' | 'bad'): React.CSSProperties => {
  if (tone === 'good') {
    return { backgroundColor: theme.colors.accentSoft, color: theme.colors.accent, fontWeight: 700 };
  }
  if (tone === 'bad') {
    return { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning, fontWeight: 700 };
  }
  return { backgroundColor: theme.colors.surface, color: theme.colors.ink };
};

/** 比較表レイアウト。ヘッダーが上から降り、行 (rows[].id) が左から滑り込む */
export const TableLayout: React.FC<{ content: ContentOf<'table'> }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { introAt } = useSceneContext();
  const columns = `minmax(240px, 1.1fr) repeat(${content.headers.length}, minmax(0, 1.4fr))`;

  const headerCell = (key: React.Key, i: number, label: string, bg: string) => {
    const p = springFrom(frame, introAt + 4 + i * 3, fps, SPRINGS.snappy);
    return (
      <div
        key={key}
        style={{
          backgroundColor: bg,
          borderRadius: theme.radius,
          padding: '16px 24px',
          fontSize: 19,
          fontWeight: 800,
          color: theme.colors.onAccent,
          textAlign: 'center',
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(${(1 - p) * -30}px)`,
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <ContentArea style={{ flexDirection: 'column' }}>
      <div style={{ width: 1420 }}>
        <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 10 }}>
          {headerCell('corner', 0, '', theme.colors.ink)}
          {content.headers.map((h, i) =>
            headerCell(i, i + 1, h.label, h.tone === 'accent' ? theme.colors.accent : theme.colors.ink),
          )}
        </div>
        {content.rows.map((row, ri) => (
          <Reveal key={row.id} id={row.id} order={ri + 2} preset="slideLeft">
            <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 10, marginTop: 10, alignItems: 'stretch' }}>
              <div
                style={{
                  ...theme.card,
                  padding: '18px 24px',
                  fontSize: 20,
                  fontWeight: 800,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {row.label}
                {row.note ? (
                  <span style={{ fontSize: 14, fontWeight: 400, color: theme.colors.textFaint, marginTop: 4 }}>
                    {row.note}
                  </span>
                ) : null}
              </div>
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: theme.radius,
                    border: `1px solid ${theme.colors.line}`,
                    padding: '18px 22px',
                    fontSize: 18,
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    ...cellStyle(theme, cell.tone),
                  }}
                >
                  {cell.text}
                </div>
              ))}
            </div>
          </Reveal>
        ))}
        {content.source ? (
          <div style={{ fontSize: 14, color: theme.colors.textFaint, marginTop: 18, paddingLeft: 8 }}>{content.source}</div>
        ) : null}
      </div>
    </ContentArea>
  );
};
