import React from 'react';
import { Reveal } from '../components/Reveal';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type TableScene = Extract<Scene, { layout: 'table' }>;

const cellStyle = (tone: 'normal' | 'good' | 'bad'): React.CSSProperties => {
  if (tone === 'good') {
    return { backgroundColor: COLORS.accentSoft, color: COLORS.accent };
  }
  if (tone === 'bad') {
    return { backgroundColor: COLORS.warningSoft, color: COLORS.warning };
  }
  return { backgroundColor: '#FFFFFF', color: COLORS.ink };
};

/** 比較表レイアウト。行 (rows[].id) を単位に reveal する。ヘッダーは常時表示 */
export const TableLayout: React.FC<{ content: TableScene['content']; revealAt: RevealAt }> = ({
  content,
  revealAt,
}) => {
  const columns = `minmax(240px, 1.1fr) repeat(${content.headers.length}, minmax(0, 1.4fr))`;

  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 1420 }}>
        {/* ヘッダー行 */}
        <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 10 }}>
          <div
            style={{
              backgroundColor: COLORS.ink,
              borderRadius: 8,
              padding: '16px 24px',
              fontSize: 18,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          />
          {content.headers.map((h, i) => (
            <div
              key={i}
              style={{
                backgroundColor: h.tone === 'accent' ? COLORS.accent : COLORS.ink,
                borderRadius: 8,
                padding: '16px 24px',
                fontSize: 18,
                fontWeight: 700,
                color: '#FFFFFF',
                textAlign: 'center',
              }}
            >
              {h.label}
            </div>
          ))}
        </div>
        {/* データ行 */}
        {content.rows.map((row) => (
          <Reveal key={row.id} at={revealAt(row.id)}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: columns,
                gap: 10,
                marginTop: 10,
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  ...CARD,
                  padding: '18px 24px',
                  fontSize: 19,
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                {row.label}
                {row.note ? (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: COLORS.textFaint,
                      marginTop: 4,
                    }}
                  >
                    {row.note}
                  </span>
                ) : null}
              </div>
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${COLORS.line}`,
                    padding: '18px 22px',
                    fontSize: 17,
                    lineHeight: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    ...cellStyle(cell.tone),
                  }}
                >
                  {cell.text}
                </div>
              ))}
            </div>
          </Reveal>
        ))}
        {content.source ? (
          <div style={{ fontSize: 14, color: COLORS.textFaint, marginTop: 18, paddingLeft: 8 }}>
            {content.source}
          </div>
        ) : null}
      </div>
    </div>
  );
};
