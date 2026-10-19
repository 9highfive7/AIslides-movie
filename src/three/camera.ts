import { Box3, PerspectiveCamera, Vector3 } from 'three';

/** 3D の場面に共通のカメラの扱い (画角・カメラ位置の補間・画面への投影) */

export const ASPECT = 1920 / 1080;

export interface Shot {
  position: Vector3;
  target: Vector3;
}

export const shot = (position: [number, number, number], target: [number, number, number]): Shot => ({
  position: new Vector3(...position),
  target: new Vector3(...target),
});

export const lerpShot = (a: Shot, b: Shot, t: number): Shot => ({
  position: a.position.clone().lerp(b.position, t),
  target: a.target.clone().lerp(b.target, t),
});

/** 止まって見えないよう、注視点のまわりをわずかに回り込む。drift はシーン全体で 0→1 */
export const withDrift = (s: Shot, drift: number, amount = 0.12): Shot => {
  const offset = s.position.clone().sub(s.target);
  const angle = (drift - 0.5) * amount;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotated = new Vector3(offset.x * cos - offset.z * sin, offset.y, offset.x * sin + offset.z * cos);
  return { position: s.target.clone().add(rotated), target: s.target };
};

/** 3D の点が 1920×1080 の画面のどこに写るか [px] */
export const projectToScreen = (point: Vector3, s: Shot, fov: number): { x: number; y: number } => {
  const camera = new PerspectiveCamera(fov, ASPECT, 0.1, 400);
  camera.position.copy(s.position);
  camera.lookAt(s.target);
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * 1920, y: ((1 - ndc.y) / 2) * 1080 };
};

/** 描く画面の大きさ [px] と縦の画角 [度]。横の動画は 1920×1080・縦の動画 (ショート) は 1080×1920 */
export interface Lens {
  fov: number;
  w: number;
  h: number;
}

/** 画面の上の範囲 [px] */
export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** カメラから見た 3D の点 → 画面の位置 [px] (z は -1〜1 の奥行き。範囲の外はカメラの後ろか遠すぎ) */
export const makeProjector = (s: Shot, lens: Lens) => {
  const camera = new PerspectiveCamera(lens.fov, lens.w / lens.h, 0.1, 2000);
  camera.position.copy(s.position);
  camera.lookAt(s.target);
  camera.updateMatrixWorld();
  return (p: Vector3) => {
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) / 2) * lens.w, y: ((1 - v.y) / 2) * lens.h, z: v.z };
  };
};

const DEG = Math.PI / 180;

const shotAt = (target: Vector3, dir: Vector3, dist: number): Shot => ({
  position: target.clone().addScaledVector(dir, dist),
  target: target.clone(),
});

/**
 * points がすべて画面の rect に収まる、いちばん近いカメラ位置。
 * dir は注視点からカメラへの向き (正規化済み)。写った範囲の中心が rect の中心に来るよう注視点もずらす
 */
export const fitShotToRect = (points: Vector3[], dir: Vector3, lens: Lens, rect: Rect, start?: Vector3): Shot => {
  const target = start ? start.clone() : new Box3().setFromPoints(points).getCenter(new Vector3());
  const forward = dir.clone().negate();
  const right = forward.clone().cross(new Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(forward).normalize();
  let dist = 10;
  for (let pass = 0; pass < 3; pass++) {
    let lo = 0.2;
    let hi = 3000;
    for (let k = 0; k < 40; k++) {
      const mid = Math.sqrt(lo * hi);
      const project = makeProjector(shotAt(target, dir, mid), lens);
      const fits = points.every((p) => {
        const s = project(p);
        return s.z > -1 && s.z < 1 && s.x >= rect.x0 && s.x <= rect.x1 && s.y >= rect.y0 && s.y <= rect.y1;
      });
      if (fits) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    dist = hi;
    // 写った範囲の中心が rect の中心に来るよう、注視点を画面の上下左右にずらしてから測り直す
    const project = makeProjector(shotAt(target, dir, dist), lens);
    const screen = points.map(project);
    const dx = (Math.min(...screen.map((s) => s.x)) + Math.max(...screen.map((s) => s.x))) / 2 - (rect.x0 + rect.x1) / 2;
    const dy = (Math.min(...screen.map((s) => s.y)) + Math.max(...screen.map((s) => s.y))) / 2 - (rect.y0 + rect.y1) / 2;
    const perPx = (2 * dist * Math.tan((lens.fov * DEG) / 2)) / lens.h;
    target.addScaledVector(right, dx * perPx).addScaledVector(up, -dy * perPx);
  }
  return shotAt(target, dir, dist);
};
