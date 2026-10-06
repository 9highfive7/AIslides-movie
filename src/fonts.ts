import { continueRender, delayRender, staticFile } from 'remotion';

/**
 * Noto Sans JP を public/fonts から読み込む。
 * 可変フォント (weight 100-900) 1ファイルをリポジトリに同梱しており、
 * レンダリング時に外部通信は不要。見出し700・本文400 で使用する。
 */
const FONT_FAMILY = 'Noto Sans JP';

let requested = false;

export const ensureFonts = (): void => {
  if (requested) {
    return;
  }
  requested = true;

  const handle = delayRender('load Noto Sans JP');
  const url = staticFile('fonts/NotoSansJP-VF.ttf');
  const face = new FontFace(FONT_FAMILY, `url("${url}")`, {
    weight: '100 900',
    style: 'normal',
  });

  face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      continueRender(handle);
    })
    .catch((error) => {
      // 読み込みに失敗してもレンダリングは続行 (システムフォントの代替で描画される)
      console.error('フォントの読み込みに失敗しました。代替フォントで描画します。', error);
      continueRender(handle);
    });
};
