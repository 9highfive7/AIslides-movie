import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { DrawArrow } from '../components/DrawArrow';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { ContentArea, type ContentOf } from './common';
import { useVertical } from '../stage';

type IoBox = ContentOf<'inputOutput'>['input'];

const IoCard: React.FC<{ box: IoBox }> = ({ box }) => {
  const theme = useTheme();
  // 縦の動画 (ショート): 横長のカード (アイコンが左、文字が右)
  if (useVertical()) {
    return (
      <div style={{ ...theme.card, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <IconBox name={box.icon} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 27, fontWeight: 800 }}>{box.title}</div>
          {box.body ? <div style={{ fontSize: 17, lineHeight: 1.55, color: theme.colors.textSecondary, marginTop: 2 }}>{box.body}</div> : null}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        ...theme.card,
        width: 460,
        padding: '44px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 18,
      }}
    >
      <IconBox name={box.icon} size={76} />
      <div style={{ fontSize: 27, fontWeight: 800 }}>{box.title}</div>
      {box.body ? (
        <div style={{ fontSize: 17, lineHeight: 1.7, color: theme.colors.textSecondary }}>{box.body}</div>
      ) : null}
    </div>
  );
};

/**
 * 入力 → 変換 → 出力。矢印は arrow-1 (入力→変換)、arrow-2 (変換→出力)。
 * 変換ボックスは処理中であることを示すように枠が脈打つ。
 */
export const InputOutputLayout: React.FC<{ content: ContentOf<'inputOutput'> }> = ({ content }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  const frame = useCurrentFrame();
  const pulse = (Math.sin(frame / 8) + 1) / 2;
  // 縦の動画 (ショート): 入力・変換・出力を上から下へ積み、矢印は下向きにする
  const vertical = useVertical();
  const arrow = (id: string, order: number) =>
    vertical ? (
      <div style={{ flexShrink: 0, height: 52, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: 'rotate(90deg)', width: 60, height: 36 }}>
          <DrawArrow at={ctx.appearAt(id, order)} width={60} color={theme.colors.textFaint} flowColor={theme.colors.accent} />
        </div>
      </div>
    ) : (
      <div style={{ flexShrink: 0, width: 84, display: 'flex', justifyContent: 'center' }}>
        <DrawArrow at={ctx.appearAt(id, order)} width={76} color={theme.colors.textFaint} flowColor={theme.colors.accent} />
      </div>
    );

  return (
    <ContentArea bottom={260} style={vertical ? { flexDirection: 'column', alignItems: 'stretch' } : undefined}>
      <Reveal id={content.input.id} order={0} preset="slideLeft">
        <IoCard box={content.input} />
      </Reveal>
      {arrow('arrow-1', 1)}
      <Reveal id={content.transform.id} order={2} preset="pop">
        <div
          style={{
            width: vertical ? undefined : 300,
            padding: '28px 30px',
            borderRadius: theme.radius,
            backgroundColor: theme.colors.accentSoft,
            border: `2px solid ${theme.colors.accentBorder}`,
            boxShadow: `0 0 0 ${4 + pulse * 8}px ${theme.colors.accentSoft}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: theme.colors.accent, lineHeight: 1.6 }}>
            {content.transform.label}
          </div>
        </div>
      </Reveal>
      {arrow('arrow-2', 3)}
      <Reveal id={content.output.id} order={4} preset="slideRight">
        <IoCard box={content.output} />
      </Reveal>
    </ContentArea>
  );
};
