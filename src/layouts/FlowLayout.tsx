import React, { Fragment } from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { DrawArrow } from '../components/DrawArrow';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { ContentArea, type ContentOf } from './common';
import { useVertical } from '../stage';

type Step = ContentOf<'flow'>['steps'][number];

/** 縦の動画 (ショート) のステップ: 横長のカードに、左に番号 (とアイコン)、右に名前と補足 */
const ShortsStep: React.FC<{ step: Step; n: number }> = ({ step, n }) => {
  const theme = useTheme();
  const editorial = theme.chrome === 'editorial';
  return (
    <div style={{ ...theme.card, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
      <div
        style={
          editorial
            ? { fontFamily: theme.fonts.display, fontSize: 34, fontWeight: 600, color: theme.colors.textSecondary, width: 36, textAlign: 'center', flexShrink: 0 }
            : {
                minWidth: 44,
                height: 44,
                borderRadius: 999,
                backgroundColor: theme.colors.accent,
                color: theme.colors.onAccent,
                fontSize: 22,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }
        }
      >
        {n}
      </div>
      {!editorial || step.icon ? <IconBox name={step.icon} size={52} /> : null}
      <div style={{ minWidth: 0 }}>
        <div style={editorial ? { fontFamily: theme.fonts.display, fontSize: 34, fontWeight: 600 } : { fontSize: 26, fontWeight: 800 }}>{step.title}</div>
        {step.body ? <div style={{ fontSize: 18, lineHeight: 1.5, color: theme.colors.textSecondary, marginTop: 2 }}>{step.body}</div> : null}
      </div>
    </div>
  );
};

/**
 * 横並びのステップカードと矢印。矢印には step-N の間を埋める形で
 * arrow-1, arrow-2, ... のIDが自動付与される。矢印は線が引かれるように出現する。
 */
export const FlowLayout: React.FC<{ content: ContentOf<'flow'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  // editorial (paper): 丸いラベルではなく明朝の番号、アイコンは指定があるときだけ、文字は大きめ
  const editorial = theme.chrome === 'editorial';
  // 縦の動画 (ショート): ステップを上から下へ積み、矢印は下向きにする。カードは横長 (番号・アイコンが左、文字が右)
  const vertical = useVertical();
  // 矢印に reveal 指定がなく、矢印の先のステップが reveal されるなら、そのステップと一緒に伸ばす
  // (矢印だけが先に出て宙に浮くのを防ぐ)
  const arrowAt = (i: number): number => {
    const id = `arrow-${i}`;
    const target = content.steps[i].id;
    if (!ctx.isRevealed(id) && ctx.isRevealed(target)) {
      return ctx.appearAt(target, i * 2);
    }
    return ctx.appearAt(id, i * 2 - 1);
  };

  return (
    <ContentArea bottom={260}>
      <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: vertical ? 'stretch' : 'center', width: '100%' }}>
        {content.steps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 ? (
              <div
                style={
                  vertical
                    ? { flexShrink: 0, height: 46, display: 'flex', justifyContent: 'center', alignItems: 'center' }
                    : { flexShrink: 0, width: 76, display: 'flex', justifyContent: 'center' }
                }
              >
                {vertical ? (
                  <div style={{ transform: 'rotate(90deg)', width: 56, height: 36 }}>
                    <DrawArrow at={arrowAt(i)} width={56} color={theme.colors.textFaint} flowColor={theme.colors.accent} />
                  </div>
                ) : (
                  <DrawArrow
                    at={arrowAt(i)}
                    color={theme.colors.textFaint}
                    flowColor={theme.colors.accent}
                  />
                )}
              </div>
            ) : null}
            <Reveal id={step.id} order={i * 2} preset="pop" style={{ flex: vertical ? undefined : 1, minWidth: 0 }}>
              {vertical ? (
                <ShortsStep step={step} n={i + 1} />
              ) : (
              <div
                style={{
                  ...theme.card,
                  position: 'relative',
                  padding: editorial ? '28px 24px 34px' : '38px 22px 30px',
                  minHeight: editorial ? 300 : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                }}
              >
                {editorial ? (
                  <div
                    style={{
                      fontFamily: theme.fonts.display,
                      fontSize: 22,
                      fontWeight: 600,
                      color: theme.colors.textSecondary,
                      paddingBottom: 6,
                      borderBottom: `1px solid ${theme.colors.line}`,
                    }}
                  >
                    {i + 1}
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      top: -18,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 16px',
                      borderRadius: 999,
                      backgroundColor: theme.colors.accent,
                      color: theme.colors.onAccent,
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    STEP {i + 1}
                  </div>
                )}
                {!editorial || step.icon ? <IconBox name={step.icon} size={64} /> : null}
                <div
                  style={
                    editorial
                      ? { fontFamily: theme.fonts.display, fontSize: 44, fontWeight: 600, marginTop: 8 }
                      : { fontSize: 23, fontWeight: 800 }
                  }
                >
                  {step.title}
                </div>
                {step.body ? (
                  <div
                    style={{
                      fontSize: editorial ? 21 : 16,
                      lineHeight: 1.65,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {step.body}
                  </div>
                ) : null}
              </div>
              )}
            </Reveal>
          </Fragment>
        ))}
      </div>
    </ContentArea>
  );
};
