import React, { createContext, useContext } from 'react';
import { useVideoConfig } from 'remotion';

/**
 * 縦の動画 (YouTube ショート 1080×1920) の割り付け [px]。
 * ショートの画面は、上 (タブ・検索)・下 (タイトル・説明・音楽)・右 (高評価・コメントのボタン) が
 * アプリの UI で隠れるので、見出し・字幕・図解はその内側 (safe) に置く。
 */
export const SHORTS = {
  width: 1080,
  height: 1920,
  /** 文字を置いてよい範囲の、画面の端からの距離 (上 12%・下 20%・右 15% は UI に隠れる) */
  safe: { left: 64, right: 162, top: 236, bottom: 400 },
  /** 見出しの上端 */
  headingTop: 300,
  /** 図解 (カード・グラフ) を置く範囲の、上端と画面の下からの距離 (見出しの下〜字幕の上) */
  content: { top: 480, bottom: 590 },
  /** 図解の拡大率。横の動画と同じ部品を、スマホの縦画面で読める大きさにする */
  scale: 1.4,
  /** 3D の場面 (16:9 の絵) を置く帯の中心の高さ */
  bandCenter: 905,
  /** 3D の帯の上下に、3D の世界を描き足す倍率 (帯の高さの何倍まで描くか) */
  bandExtend: 2,
  /** 3D の帯の中の文字 (注釈・名札・数字) の拡大率。帯は縮めて置くので、文字だけ大きくする */
  bandText: 1.6,
  /**
   * 縦の画面に合わせて組み直す 3D の場面 (組み立て・並べる形) の、物と注釈を置く範囲 [px]。
   * 見出しの下〜字幕の上。注釈の箱は物の上と下に並べ、物はその間に収まるようカメラを寄せる
   */
  scene3d: { left: 64, right: 918, top: 500, bottom: 1330 },
  /** 縦の画面で組み直した 3D の場面の、文字 (注釈・名札・数字) の拡大率 */
  scene3dText: 1.35,
  /** 縦の画面で組み直した 3D の場面の、縦の画角 [度] (横の画角が横の動画の約半分になる。遠近感をそろえる) */
  scene3dFov: 46,
} as const;

/** 図解を置く範囲の大きさ (拡大する前の大きさ。中の部品はこの大きさで並べる) */
export const SHORTS_AREA = {
  width: (SHORTS.width - SHORTS.safe.left - SHORTS.safe.right) / SHORTS.scale,
  height: (SHORTS.height - SHORTS.content.top - SHORTS.content.bottom) / SHORTS.scale,
};

/**
 * レイアウトが描く画面の大きさと向き。
 *   width / height: 座標の基準 (横の動画は 1920×1080。縦の動画では、3D の帯の中だけ 1920×1080 のまま)
 *   vertical: 縦の動画 (ショート) を作っている
 *   band: 縦の動画の中に、16:9 の帯として縮めて置いている (3D の作り込んだ場面 preset・並べる形 objects)。
 *         縦の動画で band でない 3D の場面は、縦の画面に合わせてカメラと注釈を組み直す (isPortrait3D)
 *   extend: 3D を帯の上下に描き足す倍率 (帯の中だけ。それ以外は 1)
 *   textScale: 注釈などの文字の拡大率
 */
export interface Stage {
  width: number;
  height: number;
  vertical: boolean;
  band: boolean;
  extend: number;
  textScale: number;
}

const StageContext = createContext<Stage | null>(null);

export const useStage = (): Stage => {
  const stage = useContext(StageContext);
  const { width, height } = useVideoConfig();
  return stage ?? { width, height, vertical: height > width, band: false, extend: 1, textScale: 1 };
};

/** 縦の動画 (ショート) を作っているか */
export const useVertical = (): boolean => useStage().vertical;

/**
 * 縦の動画の中に、16:9 (1920×1080) の場面を画面の幅いっぱいの帯として置く。
 * 3D の場面は、カメラ・注釈の位置が 16:9 の画面で決めてあるので、そのまま縮めて置く
 * (3D は帯の上下にも描き足すので、帯の外も 3D の世界がつながって見える)。
 */
export const StageBand: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  const scale = width / 1920;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: SHORTS.bandCenter - (1080 * scale) / 2,
        width: 1920,
        height: 1080,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      }}
    >
      <StageContext.Provider
        value={{ width: 1920, height: 1080, vertical: true, band: true, extend: SHORTS.bandExtend, textScale: SHORTS.bandText }}
      >
        {children}
      </StageContext.Provider>
    </div>
  );
};

/**
 * 縦の動画の 3D の場面を、縦の画面 (1080×1920) のまま描く。カメラ・注釈の位置は各レイアウトが縦の画面に合わせて決める
 * (組み立て (parts)。作り込んだ場面 (preset)・並べる形 (objects) は StageBand で帯にする)。
 */
export const StagePortrait: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StageContext.Provider
    value={{ width: SHORTS.width, height: SHORTS.height, vertical: true, band: false, extend: 1, textScale: SHORTS.scene3dText }}
  >
    {children}
  </StageContext.Provider>
);

/** 3D の場面を縦の画面に合わせて組み直して描くか (縦の動画で、帯に縮めていない) */
export const isPortrait3D = (stage: Stage): boolean => stage.vertical && !stage.band;

const DEG = Math.PI / 180;

/**
 * 3D の描画面 (ThreeCanvas) の大きさと画角。帯の中では、上下に extend 倍まで描き足す。
 * 横の画角が変わらないよう縦の画角を広げるので、帯の部分は 16:9 で描いたときとまったく同じ絵になる
 * (注釈の位置などは 16:9 の計算のまま合う)。
 */
export const canvasFrame = (
  stage: Stage,
  fov: number,
): { width: number; height: number; fov: number; style?: React.CSSProperties } => {
  if (stage.extend === 1) {
    return { width: stage.width, height: stage.height, fov };
  }
  const height = Math.round(stage.height * stage.extend);
  return {
    width: stage.width,
    height,
    fov: (2 * Math.atan(Math.tan((fov * DEG) / 2) * stage.extend)) / DEG,
    style: { position: 'absolute', left: 0, top: -(height - stage.height) / 2 },
  };
};
