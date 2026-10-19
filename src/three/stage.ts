import * as THREE from 'three';
import { interpolate, Easing } from 'remotion';

/**
 * scene3d の配置とカメラの計算 (React に依存しない純粋な関数)。
 * 物はすべて床 (y=0) に置き、x を左右・z を奥行き (手前が +) とする。
 */

export type Arrangement = 'row' | 'flow' | 'cycle';
export type V3 = [number, number, number];

export const VIDEO_W = 1920;
export const VIDEO_H = 1080;

/** 物1つ (count=1・size=1) の幅と奥行きの目安 */
const UNIT_W = 1.8;
const UNIT_D = 1.3;

export interface StageItem {
  count: number;
  size: number;
}

export interface PlacedGroup {
  /** グループ (同じ物 count 個) の中心 */
  x: number;
  z: number;
  /** 全体の縮尺 × size を掛けたグループの倍率 */
  scale: number;
  /** グループの幅・奥行き (ワールド座標) */
  width: number;
  depth: number;
  /** count 個の物の位置 (グループ中心からの相対。y は段の高さ) と倍率 */
  copies: Array<{ x: number; y: number; z: number; scale: number }>;
  /** 奥の列を乗せるひな壇 (グループ中心からの相対。高さ h・奥行き d) */
  steps: Array<{ z: number; h: number; d: number }>;
}

export interface StageLayout {
  groups: PlacedGroup[];
  /** cycle のときの楕円 (矢印の通り道) */
  ellipse: { rx: number; rz: number; cz: number } | null;
}

/**
 * count 個を小さな格子に並べる。奥の列は半分ずらし、ひな壇に乗せて一段高くする
 * (手前の物に隠れず、全部数えられるように)
 */
const copyGrid = (count: number): { cols: number; rows: number; scale: number } => {
  if (count === 1) {
    return { cols: 1, rows: 1, scale: 1 };
  }
  const cols = count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : 4;
  return { cols, rows: Math.ceil(count / cols), scale: count <= 4 ? 0.64 : 0.5 };
};

/** ひな壇1段の高さ (count=1 の物の高さ 1.6 に対する目安) */
const STEP_H = 0.75;

const groupShape = (item: StageItem) => {
  const grid = copyGrid(item.count);
  const dx = UNIT_W * grid.scale * 1.02;
  const dz = UNIT_D * grid.scale * 1.05;
  const z0 = ((grid.rows - 1) / 2) * dz;
  const copies = Array.from({ length: item.count }, (_, i) => {
    const row = Math.floor(i / grid.cols);
    const col = i % grid.cols;
    const inRow = Math.min(grid.cols, item.count - row * grid.cols);
    const stagger = row % 2 === 1 ? dx * 0.5 : 0;
    return {
      x: (col - (inRow - 1) / 2) * dx + stagger - (grid.rows > 1 ? dx * 0.25 : 0),
      y: row * STEP_H * grid.scale,
      z: z0 - row * dz,
      scale: grid.scale,
    };
  });
  const steps = Array.from({ length: grid.rows - 1 }, (_, k) => {
    const row = k + 1;
    return { z: z0 - row * dz, h: row * STEP_H * grid.scale, d: dz };
  });
  const width = (grid.cols - 1) * dx + UNIT_W * grid.scale + (grid.rows > 1 ? dx * 0.5 : 0);
  const depth = (grid.rows - 1) * dz + UNIT_D * grid.scale;
  return { copies, steps, width: width * item.size, depth: depth * item.size };
};

export const layoutStage = (items: StageItem[], arrangement: Arrangement): StageLayout => {
  const shapes = items.map(groupShape);

  // 縦に収まる最大の倍率 (いちばん大きい物が見出しや画面上端にかからないように)
  const maxSize = Math.max(...items.map((item) => item.size));
  const verticalFit = (maxScale: number) => maxScale / maxSize;

  if (arrangement === 'cycle') {
    const n = items.length;
    const fit = Math.min(n <= 3 ? 1 : n === 4 ? 0.92 : n === 5 ? 0.82 : 0.74, verticalFit(1.1));
    const ellipse = { rx: 4.3, rz: 2.1, cz: -0.3 };
    const groups = shapes.map((shape, i) => {
      // 上 (奥) から時計回り: 奥 → 右 → 手前 → 左
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const scale = fit * items[i].size;
      return {
        x: Math.cos(a) * ellipse.rx,
        z: ellipse.cz + Math.sin(a) * ellipse.rz,
        scale,
        width: shape.width * fit,
        depth: shape.depth * fit,
        copies: shape.copies,
        steps: shape.steps,
      };
    });
    return { groups, ellipse };
  }

  const gap = arrangement === 'flow' ? 1.5 : 0.7;
  const total = shapes.reduce((sum, s) => sum + s.width, 0) + gap * (items.length - 1);
  // 画面の左右に収まる幅 (カメラの揺れの分の余白を残す)
  const fit = Math.min(1.45, verticalFit(1.5), (arrangement === 'flow' ? 10.2 : 10.8) / total);
  // 右下のキャラクターと重ならないよう、少し左に寄せる
  let cursor = (-total * fit) / 2 - 0.3;
  const groups = shapes.map((shape, i) => {
    const width = shape.width * fit;
    const x = cursor + width / 2;
    cursor += width + gap * fit;
    return { x, z: 0, scale: fit * items[i].size, width, depth: shape.depth * fit, copies: shape.copies, steps: shape.steps };
  });
  return { groups, ellipse: null };
};

/**
 * cycle の矢印。物を並べた楕円の内側にひと回り小さな輪を作り、
 * 物と物の間 (角度) を結ぶ弧を矢印にする (物と重ならず、輪がひと目でわかる)。
 */
export const cycleArrows = (
  stage: StageLayout,
): { ring: { rx: number; rz: number; cz: number }; arcs: Array<{ a0: number; a1: number }> } | null => {
  const { ellipse, groups } = stage;
  if (!ellipse) {
    return null;
  }
  const n = groups.length;
  const ring = { rx: ellipse.rx * 0.56, rz: ellipse.rz * 0.66, cz: ellipse.cz };
  const gap = Math.min(0.22, (Math.PI / n) * 0.2);
  const arcs = groups.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const b = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
    return { a0: a + gap, a1: b - gap };
  });
  return { ring, arcs };
};

export interface CameraPose {
  position: V3;
  target: V3;
  fov: number;
}

/**
 * カメラの動き。シーン冒頭に横から回り込んで正面に収まり (3D らしさ)、
 * その後はゆっくり左右に揺れながら少しずつ寄る。
 */
export const cameraPose = (arrangement: Arrangement, frame: number, start: number, end: number): CameraPose => {
  const base =
    arrangement === 'cycle'
      ? { position: new THREE.Vector3(0, 6.4, 11.2), target: new THREE.Vector3(0, 0.15, -0.35), fov: 33 }
      : { position: new THREE.Vector3(0, 3.1, 12.6), target: new THREE.Vector3(0, 0.72, 0), fov: 30 };

  const t = frame - start;
  const swoop = interpolate(t, [0, 55], [0.55, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const sway = Math.sin(t / 95) * 0.06;
  const dolly = interpolate(frame, [start, end], [1.05, 0.97], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rise = interpolate(t, [0, 55], [1.2, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const offset = base.position.clone().sub(base.target).multiplyScalar(dolly);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), swoop + sway);
  offset.y += rise;
  const position = base.target.clone().add(offset);
  return { position: position.toArray() as V3, target: base.target.toArray() as V3, fov: base.fov };
};

const scratchCamera = new THREE.PerspectiveCamera(30, VIDEO_W / VIDEO_H, 0.1, 200);

/** ワールド座標 → 画面座標 (px)。3D の物の下に HTML の名札を置くのに使う */
export const projectToScreen = (pose: CameraPose, point: V3): { x: number; y: number } => {
  scratchCamera.fov = pose.fov;
  scratchCamera.position.set(...pose.position);
  scratchCamera.lookAt(...pose.target);
  scratchCamera.updateProjectionMatrix();
  scratchCamera.updateMatrixWorld();
  const v = new THREE.Vector3(...point).project(scratchCamera);
  return { x: ((v.x + 1) / 2) * VIDEO_W, y: ((1 - v.y) / 2) * VIDEO_H };
};
