import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { CARD, COLORS, PAGE } from '../theme';
import type { Scene } from '../schemas';
import type { RevealAt } from '../Slideshow';

type InputOutputScene = Extract<Scene, { layout: 'inputOutput' }>;
type IoBox = InputOutputScene['content']['input'];

const IoCard: React.FC<{ box: IoBox }> = ({ box }) => {
  return (
    <div
      style={{
        ...CARD,
        width: 460,
        padding: '44px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 18,
      }}
    >
      <IconBox name={box.icon} size={72} />
      <div style={{ fontSize: 26, fontWeight: 700 }}>{box.title}</div>
      {box.body ? (
        <div style={{ fontSize: 16, lineHeight: 1.7, color: COLORS.textSecondary }}>{box.body}</div>
      ) : null}
    </div>
  );
};

const Arrow: React.FC = () => (
  <div style={{ flexShrink: 0, width: 64, display: 'flex', justifyContent: 'center' }}>
    <ArrowRight size={34} strokeWidth={1.75} color={COLORS.textFaint} />
  </div>
);

/**
 * 入力 → 変換 → 出力。矢印は arrow-1 (入力→変換)、arrow-2 (変換→出力)。
 */
export const InputOutputLayout: React.FC<{
  content: InputOutputScene['content'];
  revealAt: RevealAt;
}> = ({ content, revealAt }) => {
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
        justifyContent: 'center',
      }}
    >
      <Reveal at={revealAt(content.input.id)}>
        <IoCard box={content.input} />
      </Reveal>
      <Reveal at={revealAt('arrow-1')} style={{ flexShrink: 0, width: 64, display: 'flex', justifyContent: 'center' }}>
        <ArrowRight size={34} strokeWidth={1.75} color={COLORS.textFaint} />
      </Reveal>
      <Reveal at={revealAt(content.transform.id)}>
        <div
          style={{
            width: 300,
            padding: '28px 30px',
            borderRadius: 8,
            backgroundColor: COLORS.accentSoft,
            border: `1px solid ${COLORS.accentBorder}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 700, color: COLORS.accent, lineHeight: 1.6 }}>
            {content.transform.label}
          </div>
        </div>
      </Reveal>
      <Reveal at={revealAt('arrow-2')} style={{ flexShrink: 0, width: 64, display: 'flex', justifyContent: 'center' }}>
        <ArrowRight size={34} strokeWidth={1.75} color={COLORS.textFaint} />
      </Reveal>
      <Reveal at={revealAt(content.output.id)}>
        <IoCard box={content.output} />
      </Reveal>
    </div>
  );
};
