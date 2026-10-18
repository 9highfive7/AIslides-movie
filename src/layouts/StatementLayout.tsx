import React from 'react';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { KineticText } from '../components/KineticText';
import { PAGE, useTheme } from '../theme';
import { useSceneContext } from '../context/SceneContext';

/**
 * 一文を大きく見せる「キメ」のレイアウト。
 * 文字が1つずつ弾んで出た後、**強調** 部分にマーカーが引かれる。
 * reveal 要素: "text" (本文) と "sub" (補足)。
 */
export const StatementLayout: React.FC<{
  content: { text: string; sub?: string; icon?: string };
  hasHeading: boolean;
}> = ({ content, hasHeading }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  const textAt = ctx.appearAt('text', 1);

  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX + 60,
        right: PAGE.paddingX + 60,
        top: hasHeading ? PAGE.contentTop - 20 : 100,
        bottom: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
      }}
    >
      {content.icon ? (
        <Reveal id={null} order={0} preset="pop">
          <IconBox name={content.icon} size={110} />
        </Reveal>
      ) : null}
      <KineticText
        text={content.text}
        at={textAt}
        stagger={1.6}
        rise={0.7}
        markerColor={theme.colors.highlight}
        markerInk={theme.colors.highlightInk}
        style={{
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.35,
          textAlign: 'center',
          color: theme.colors.ink,
        }}
      />
      {content.sub ? (
        <Reveal id="sub" order={3} preset="fadeUp">
          <div style={{ fontSize: 26, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
            {content.sub}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
};
