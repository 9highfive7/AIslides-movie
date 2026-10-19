import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { IconBox } from '../components/IconBox';
import { KineticText } from '../components/KineticText';
import { PAGE, useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';

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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const textAt = ctx.appearAt('text', 1);
  const editorial = theme.chrome === 'editorial';
  const stagger = editorial ? 1.1 : 1.6;
  const chars = [...content.text.replace(/\*\*|\n/g, '')].length;
  const ruleP = springFrom(frame, textAt + chars * stagger + 6, fps, SPRINGS.smooth);

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
        stagger={stagger}
        rise={editorial ? 0.3 : 0.7}
        markerColor={theme.colors.highlight}
        markerInk={theme.colors.highlightInk}
        style={{
          fontFamily: theme.fonts.display,
          fontSize: editorial ? 68 : 76,
          fontWeight: editorial ? 600 : 900,
          lineHeight: editorial ? 1.6 : 1.35,
          letterSpacing: editorial ? '0.04em' : undefined,
          textAlign: 'center',
          color: theme.colors.ink,
        }}
      />
      {editorial ? (
        // 文の下に細い罫線を引く (図解ドキュメンタリー風)
        <div style={{ width: 640 * ruleP, height: 2, backgroundColor: theme.colors.ink, marginTop: -6 }} />
      ) : null}
      {content.sub ? (
        <Reveal id="sub" order={3} preset="fadeUp">
          <div style={{ fontSize: 30, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
            {content.sub}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
};
