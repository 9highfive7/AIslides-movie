import { PerspectiveCamera, Vector3 } from 'three';

/**
 * 3D の場面「phoneChip」の寸法とカメラの動き。
 * 3D の描画 (PhoneChipModel) と、その上に重ねる 2D の注釈 (引き出し線の位置計算) の両方から使う。
 * 単位はおおよそ cm。y が上、+z が手前。
 */

export const FOV = 30;
export const ASPECT = 1920 / 1080;

/** 箱 (外寸) */
export const BOX = { width: 8, depth: 14, wall: 0.3, height: 1.4 } as const;

/** 基板の上面の高さ */
export const BOARD_TOP = 0.3 + 0.25;

/** チップ (基板の上に載る黒い板) */
export const CHIP = { x: 1.0, z: -3.6, size: 1.7, height: 0.22 } as const;
export const CHIP_CENTER = new Vector3(CHIP.x, BOARD_TOP + CHIP.height, CHIP.z);

/** 蓋を開ける角度 [度] */
export const LID_OPEN_DEG = -112;

interface Shot {
  position: Vector3;
  target: Vector3;
}

/** 引き: 箱全体を右手前の斜め上から見下ろす */
const WIDE: Shot = { position: new Vector3(12, 30, 26), target: new Vector3(0.4, 1.2, -1.6) };
/** 寄り: 基板の上のチップが画面の大半を占める */
const CHIP_SHOT: Shot = {
  position: CHIP_CENTER.clone().add(new Vector3(1.5, 5.2, 4.2)),
  target: CHIP_CENTER.clone().add(new Vector3(0, 0, -0.1)),
};
/** さらに寄り: チップの表面の模様が見える */
const CLOSE_SHOT: Shot = {
  position: CHIP_CENTER.clone().add(new Vector3(0.75, 2.6, 2.2)),
  target: CHIP_CENTER.clone().add(new Vector3(-0.05, 0, -0.15)),
};

/**
 * カメラの位置と注視点。
 * zoom / close は 0→1 の進み具合 (バネ)。drift はシーン全体を通したゆっくりした回り込み (0→1)。
 */
export const cameraAt = (zoom: number, close: number, drift: number): Shot => {
  const lerpShot = (a: Shot, b: Shot, t: number): Shot => ({
    position: a.position.clone().lerp(b.position, t),
    target: a.target.clone().lerp(b.target, t),
  });
  const shot = lerpShot(lerpShot(WIDE, CHIP_SHOT, zoom), CLOSE_SHOT, close);

  // 止まって見えないよう、注視点のまわりをわずかに回り込む
  const offset = shot.position.clone().sub(shot.target);
  const angle = (drift - 0.5) * 0.12;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotated = new Vector3(offset.x * cos - offset.z * sin, offset.y, offset.x * sin + offset.z * cos);
  return { position: shot.target.clone().add(rotated), target: shot.target };
};

/** 3D の点が 1920×1080 の画面のどこに写るか [px] */
export const projectToScreen = (point: Vector3, shot: Shot): { x: number; y: number } => {
  const camera = new PerspectiveCamera(FOV, ASPECT, 0.1, 200);
  camera.position.copy(shot.position);
  camera.lookAt(shot.target);
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * 1920, y: ((1 - ndc.y) / 2) * 1080 };
};
