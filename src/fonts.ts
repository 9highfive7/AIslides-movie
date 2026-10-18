import { continueRender, delayRender, staticFile } from 'remotion';
import { FONT_FAMILY, SERIF_FONT_FAMILY } from './themes';

/**
 * public/fonts のフォントを読み込む。
 * 可変フォント (weight 100-900) をリポジトリに同梱しており、レンダリング時に外部通信は不要。
 *   Noto Sans JP:  本文・ラベル (全テーマ)
 *   Noto Serif JP: 見出し・数字 (paper テーマなど、テーマが明朝を使うときだけ読み込む)
 */
const FONT_FILES: Record<string, string> = {
  [FONT_FAMILY]: 'fonts/NotoSansJP-VF.ttf',
  [SERIF_FONT_FAMILY]: 'fonts/NotoSerifJP-VF.ttf',
};

const requested = new Set<string>();

const loadFont = (family: string): void => {
  const file = FONT_FILES[family];
  if (!file || requested.has(family)) {
    return;
  }
  requested.add(family);

  const handle = delayRender(`load ${family}`);
  const face = new FontFace(family, `url("${staticFile(file)}")`, {
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
      console.error(`フォント ${family} の読み込みに失敗しました。代替フォントで描画します。`, error);
      continueRender(handle);
    });
};

/** 本文フォントと、テーマが使う見出しフォントを読み込む */
export const ensureFonts = (fonts: { body: string; display: string } = { body: FONT_FAMILY, display: FONT_FAMILY }): void => {
  loadFont(FONT_FAMILY);
  loadFont(fonts.body);
  loadFont(fonts.display);
};
