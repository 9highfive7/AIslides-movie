import { Vector3 } from 'three';
import { SHORTS } from '../stage';
import { fitShotToRect, makeProjector, type Lens, type Rect, type Shot } from './camera';

/**
 * 縦の動画 (ショート) の 3D の場面の割り付け。
 * 縦の画面は幅が狭いので、注釈の箱は物の左右ではなく上と下に並べ、物はその間いっぱいに写るようカメラを寄せる。
 */

/** 縦の画面の 3D の場面のレンズ (1080×1920) */
export const PORTRAIT_LENS: Lens = { fov: SHORTS.scene3dFov, w: SHORTS.width, h: SHORTS.height };

/** 注釈の箱の位置。y は箱の、物に近い側の端 (上に置く箱は下端・下に置く箱は上端) */
export interface PortraitBox {
  x: number;
  y: number;
  align: 'center';
  from: 'top' | 'bottom';
}

interface CalloutText {
  title: string;
  sub?: string;
}

/** 箱と箱・箱と物の間 [px] */
const ROW_GAP = 18;
const COL_GAP = 20;
/** 物と注釈の箱の間 (引き出し線が見える長さ) */
const LINE_GAP = 56;
/** 物を写す高さの最小 [px] (注釈が多くても、物がつぶれないように) */
const MIN_MODEL_H = 380;

const AREA = SHORTS.scene3d;
const AREA_W = AREA.right - AREA.left;

/** 文字列の幅の目安 [px]。全角は1文字 = 1em・半角は 0.6em */
const textWidth = (text: string, px: number) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2000 ? 0.6 : 1) * px, 0);

/** 注釈の箱 (ObjectScene の Callout) の大きさの目安 [px]。幅が足りないときは折り返す */
export const calloutSize = (c: CalloutText, k: number): { w: number; h: number } => {
  const pad = 22 * k * 2 + 8;
  const maxText = AREA_W - pad;
  const titleW = textWidth(c.title, 38 * k);
  const subW = c.sub ? textWidth(c.sub, 22 * k) : 0;
  const titleLines = Math.max(1, Math.ceil(titleW / maxText));
  const subLines = c.sub ? Math.max(1, Math.ceil(subW / maxText)) : 0;
  const w = Math.min(AREA_W, Math.max(Math.min(titleW, maxText), Math.min(subW, maxText)) + pad);
  const h = (titleLines * 38 * 1.45 + (subLines ? subLines * 22 * 1.45 + 2 : 0) + 26) * k + 8;
  return { w, h };
};

/** 数字カード (StatOverlay) の高さの目安 [px] */
export const statHeight = (stat: { kicker?: string; note?: string }, k: number): number =>
  (76 * 1.15 + (stat.kicker ? 24 * 1.45 : 0) + (stat.note ? 18 * 1.45 : 0) + 36) * k + 8;

interface Row {
  items: number[];
  w: number;
  h: number;
}

/** 箱を左から順に、幅に収まるだけ1行に並べる */
const packRows = (order: number[], sizes: { w: number; h: number }[]): Row[] => {
  const rows: Row[] = [];
  for (const i of order) {
    const last = rows[rows.length - 1];
    if (last && last.w + COL_GAP + sizes[i].w <= AREA_W) {
      last.items.push(i);
      last.w += COL_GAP + sizes[i].w;
      last.h = Math.max(last.h, sizes[i].h);
    } else {
      rows.push({ items: [i], w: sizes[i].w, h: sizes[i].h });
    }
  }
  return rows;
};

const stripHeight = (rows: Row[]) => rows.reduce((sum, r) => sum + r.h, 0) + ROW_GAP * Math.max(0, rows.length - 1);

export interface PortraitPlan {
  /** 物を写す範囲 */
  rect: Rect;
  /** 物が rect に収まるカメラ */
  shot: Shot;
  /** 注釈の箱 (callouts と同じ順) */
  boxes: PortraitBox[];
}

/**
 * 物の点 (points)・注釈が指す点 (anchors) から、カメラと注釈の箱を決める。
 *   1. いったん範囲いっぱいに写して、注釈が指す点の上下の並びを調べる
 *   2. 上側の半分の注釈は物の上・残りは物の下に、横に並ぶだけ並べる
 *   3. 箱の間に残った範囲に物が収まるよう、カメラを寄せ直す
 * reserveTop: 範囲の上に空けておく高さ (数字カード)。reserveBottom: 範囲の下に空けておく高さ (一言の帯)
 */
export const planPortrait = (
  points: Vector3[],
  dir: Vector3,
  anchors: Vector3[],
  callouts: CalloutText[],
  k: number,
  reserveTop = 0,
  reserveBottom = 0,
  lens: Lens = PORTRAIT_LENS,
): PortraitPlan => {
  const top = AREA.top + reserveTop;
  const bottom = AREA.bottom - reserveBottom;
  const full: Rect = { x0: AREA.left, x1: AREA.right, y0: top, y1: bottom };
  const sizes = callouts.map((c) => calloutSize(c, k));
  const n = callouts.length;
  if (n === 0) {
    return { rect: full, shot: fitShotToRect(points, dir, lens, full), boxes: [] };
  }

  // 1. 上下の並び
  const first = fitShotToRect(points, dir, lens, full);
  const pre = anchors.map(makeProjector(first, lens));
  const byY = pre.map((_, i) => i).sort((a, b) => pre[a].y - pre[b].y);
  const byX = (list: number[]) => [...list].sort((a, b) => pre[a].x - pre[b].x);
  // 指す点が物の上半分なら箱は物の上・下半分なら下 (引き出し線が物を横切らないように)。
  // 片側が 3 行以上になるときは、上下に半分ずつ分ける
  const modelYs = points.map(makeProjector(first, lens)).map((p) => p.y);
  const midY = (Math.min(...modelYs) + Math.max(...modelYs)) / 2;
  let nTop = byY.filter((i) => pre[i].y < midY).length;
  if (packRows(byY.slice(0, nTop), sizes).length > 2 || packRows(byY.slice(nTop), sizes).length > 2) {
    nTop = Math.floor(n / 2);
  }
  const topRows = packRows(byX(byY.slice(0, nTop)), sizes);
  const bottomRows = packRows(byX(byY.slice(nTop)), sizes);

  // 2. 物を写す範囲 (注釈が多くて狭すぎるときは、箱と少し重なってもよい)
  const topH = stripHeight(topRows);
  const bottomH = stripHeight(bottomRows);
  let y0 = top + (topH > 0 ? topH + LINE_GAP : 0);
  let y1 = bottom - (bottomH > 0 ? bottomH + LINE_GAP : 0);
  if (y1 - y0 < MIN_MODEL_H) {
    const lack = MIN_MODEL_H - (y1 - y0);
    const share = topH + bottomH > 0 ? topH / (topH + bottomH) : 0.5;
    y0 -= lack * share;
    y1 += lack * (1 - share);
  }
  const rect: Rect = { x0: AREA.left, x1: AREA.right, y0, y1 };
  let shot = fitShotToRect(points, dir, lens, rect);

  // 物が幅で決まって上下に余りがあるときは、箱を物に寄せ、物と箱をひとまとまりにして範囲の上下の真ん中に置く
  const ys = points.map(makeProjector(shot, lens)).map((p) => p.y);
  const modelTop = Math.min(...ys);
  const modelBottom = Math.max(...ys);
  const groupTop = topH > 0 ? Math.min(modelTop - LINE_GAP - topH, modelTop) : modelTop;
  const groupBottom = bottomH > 0 ? modelBottom + LINE_GAP + bottomH : modelBottom;
  const dy = Math.min(bottom - groupBottom, Math.max(top - groupTop, (top + bottom) / 2 - (groupTop + groupBottom) / 2));
  if (Math.abs(dy) > 0.5) {
    const forward = dir.clone().negate();
    const up = forward.clone().cross(new Vector3(0, 1, 0)).normalize().cross(forward).normalize();
    const perPx = (2 * shot.position.distanceTo(shot.target) * Math.tan((lens.fov * Math.PI) / 360)) / lens.h;
    const move = up.multiplyScalar(dy * perPx);
    shot = { position: shot.position.clone().add(move), target: shot.target.clone().add(move) };
  }

  // 箱の横の位置: 行の箱を並べ、指す点の平均の真上 (真下) に寄せる (範囲からははみ出さない)
  const final = anchors.map(makeProjector(shot, lens));
  const boxes: PortraitBox[] = new Array(n);
  const placeRow = (row: Row, edgeY: number, from: 'top' | 'bottom') => {
    const meanX = row.items.reduce((s, i) => s + final[i].x, 0) / row.items.length;
    let x = Math.min(AREA.right - row.w, Math.max(AREA.left, meanX - row.w / 2));
    for (const i of row.items) {
      boxes[i] = { x: x + sizes[i].w / 2, y: edgeY, align: 'center', from };
      x += sizes[i].w + COL_GAP;
    }
  };
  // 上の箱: 物にいちばん近い行 (最後の行) が物のすぐ上にくる。各行は下端をそろえる
  let rowTop = Math.max(top, modelTop + dy - LINE_GAP - topH);
  for (const row of topRows) {
    placeRow(row, rowTop + row.h, 'bottom');
    rowTop += row.h + ROW_GAP;
  }
  // 下の箱: 物のすぐ下から順に。各行は上端をそろえる
  let rowY = Math.min(bottom - bottomH, modelBottom + dy + LINE_GAP);
  for (const row of bottomRows) {
    placeRow(row, rowY, 'top');
    rowY += row.h + ROW_GAP;
  }
  return { rect, shot, boxes };
};
