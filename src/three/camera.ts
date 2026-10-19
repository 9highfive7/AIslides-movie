import { PerspectiveCamera, Vector3 } from 'three';

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
