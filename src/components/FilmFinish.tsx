import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { script } from '../data';
import { useTheme } from '../themes';

/**
 * 画面全体の仕上げ (字幕より下・シーンより上に重ねる)。
 * コンピューターで描いた画面は、ノイズが一切なく、四隅まで均一に明るいので「作りもの」に見えやすい。
 * 映像の仕上げでよく使う2つを薄くかけて、層を重ねた絵や図解を1つの画面になじませる。
 *   - 粒子 (grain): フィルムのような細かいノイズ。毎フレーム模様を変える
 *   - 周辺減光 (vignette): 四隅を少しだけ暗くして、目線を中央へ集める
 */
export const FilmFinish: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  // 粒子は紙・絵の質感に合う editorial (paper) だけ既定でかける。くっきりした配色のテーマは周辺減光だけ
  const grain = script.meta.finish.grain ?? theme.chrome === 'editorial';
  const vignette = script.meta.finish.vignette ?? true;
  if (!grain && !vignette) {
    return null;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {vignette ? (
        <AbsoluteFill
          style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0, 0, 0, 0) 55%, rgba(20, 12, 4, 0.28) 100%)' }}
        />
      ) : null}
      {grain ? (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.22 }}>
          <filter id="film-grain" x="0" y="0" width="100%" height="100%">
            {/* 2フレームに1回模様を変える (毎フレームだと粗く見える) */}
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(frame / 2) % 97} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#film-grain)" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
