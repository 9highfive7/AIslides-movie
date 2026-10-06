import React, { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type FlowScene = Extract<Scene, { layout: 'flow' }>;

/**
 * 横並びのステップカードと矢印。矢印には step-N の間を埋める形で
 * arrow-1, arrow-2, ... のIDが自動付与される。
 */
export const FlowLayout: React.FC<{ content: FlowScene['content']; revealAt: RevealAt }> = ({
  content,
  revealAt,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom: 260,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {content.steps.map((step, i) => (
          <Fragment key={step.id}>
            {i > 0 ? (
              <Reveal
                at={revealAt(`arrow-${i}`)}
                style={{ flexShrink: 0, width: 64, display: 'flex', justifyContent: 'center' }}
              >
                <ArrowRight size={34} strokeWidth={1.75} color={COLORS.textFaint} />
              </Reveal>
            ) : null}
            <Reveal at={revealAt(step.id)} style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...CARD,
                  padding: '30px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 16,
                }}
              >
                <IconBox name={step.icon} size={62} />
                <div style={{ fontSize: 22, fontWeight: 700 }}>{step.title}</div>
                {step.body ? (
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: COLORS.textSecondary }}>
                    {step.body}
                  </div>
                ) : null}
              </div>
            </Reveal>
          </Fragment>
        ))}
      </div>
    </div>
  );
};
