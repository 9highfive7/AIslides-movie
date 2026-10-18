import React, { Fragment } from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { DrawArrow } from '../components/DrawArrow';
import { useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';
import { ContentArea, type ContentOf } from './common';

/**
 * 横並びのステップカードと矢印。矢印には step-N の間を埋める形で
 * arrow-1, arrow-2, ... のIDが自動付与される。矢印は線が引かれるように出現する。
 */
export const FlowLayout: React.FC<{ content: ContentOf<'flow'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();

  return (
    <ContentArea bottom={260}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {content.steps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 ? (
              <div style={{ flexShrink: 0, width: 76, display: 'flex', justifyContent: 'center' }}>
                <DrawArrow
                  at={ctx.appearAt(`arrow-${i}`, i * 2 - 1)}
                  color={theme.colors.textFaint}
                  flowColor={theme.colors.accent}
                />
              </div>
            ) : null}
            <Reveal id={step.id} order={i * 2} preset="pop" style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...theme.card,
                  position: 'relative',
                  padding: '38px 22px 30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                }}
              >
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
                <IconBox name={step.icon} size={64} />
                <div style={{ fontSize: 23, fontWeight: 800 }}>{step.title}</div>
                {step.body ? (
                  <div style={{ fontSize: 16, lineHeight: 1.65, color: theme.colors.textSecondary }}>{step.body}</div>
                ) : null}
              </div>
            </Reveal>
          </Fragment>
        ))}
      </div>
    </ContentArea>
  );
};
