import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  CurvePath,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LineCurve3,
  PerspectiveCamera,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { SERIF_FONT_FAMILY, useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import type { Scene3DBuildContent } from '../schemas';
import { BUILD_PROPS, isBuildBasicShape, isBuildProp, resolveBuildColor, type BuildBasicShape } from './catalog';
import { ShapeModel } from './models';
import { Bolt, Fridge, House, VendingMachine } from './objects';
import { Billboard, C, Lights, Outlined, ShadowDisc, canvasTexture, useFontsReady, useOrbTextures } from './parts';
import { ASPECT, lerpShot, withDrift, type Shot } from './camera';
import { CameraRig, Callout, StatOverlay, TitleOverlay } from './ObjectScene';

/**
 * scene3d の「組み立て (parts)」形式。台本に書いた部品 (基本形・作り込んだ物)・流れ・注釈から、
 * 自販機の場面と同じ「ベタ塗り + 黒い輪郭線」の 3D の図解を組み立てる。
 * カメラの距離は部品全体が画面に収まるよう自動で決め、注釈の箱も左右に自動で並べる。
 */

type Content = Scene3DBuildContent;
type Part = Content['parts'][number];
type Flow = Content['flows'][number];
type V3 = [number, number, number];

const FOV = 30;
/** 寄りのバネ。ゆっくり滑らかに (約1.5秒) */
const DOLLY = { damping: 200, mass: 3, stiffness: 60 };
const DEG = Math.PI / 180;
/** 半透明の外箱の不透明度 */
const GHOST_OPACITY = 0.3;
/** 3D オブジェクト (ShapeModel) の元の高さ */
const TOY_SIZE: V3 = [1.6, 1.6, 1.6];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- 形 ---------- */

/** 基本形の既定の大きさ [幅, 高さ, 奥行き] */
const DEFAULT_SIZE: Record<BuildBasicShape, V3> = {
  box: [1, 1, 1],
  plate: [1.6, 0.1, 1.2],
  cylinder: [1, 1, 1],
  sphere: [1, 1, 1],
  hemisphere: [1.2, 0.6, 1.2],
  cone: [1, 1.2, 1],
  pyramid: [1.2, 1, 1.2],
  roof: [1.6, 0.8, 1.4],
  ring: [1, 1, 0.24],
  arrow: [1.4, 0.7, 0.2],
};

const extruded = (points: Array<[number, number]>): BufferGeometry => {
  const s = new Shape();
  points.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
};

/** 中心が原点で、幅・高さ・奥行きが 1 の形 (部品ごとに size へ伸ばす)。形ごとに1つだけ作って使い回す */
const UNIT = new Map<BuildBasicShape, BufferGeometry>();
const unitGeometry = (shape: BuildBasicShape): BufferGeometry => {
  const cached = UNIT.get(shape);
  if (cached) {
    return cached;
  }
  let g: BufferGeometry;
  switch (shape) {
    case 'box':
    case 'plate':
      g = new BoxGeometry(1, 1, 1);
      break;
    case 'cylinder':
      g = new CylinderGeometry(0.5, 0.5, 1, 40);
      break;
    case 'sphere':
      g = new SphereGeometry(0.5, 32, 20);
      break;
    case 'hemisphere':
      g = new SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, 2, 1);
      g.translate(0, -0.5, 0);
      break;
    case 'cone':
      g = new ConeGeometry(0.5, 1, 40);
      break;
    case 'pyramid':
      g = new ConeGeometry(Math.SQRT1_2, 1, 4);
      g.rotateY(Math.PI / 4);
      break;
    case 'roof':
      g = extruded([
        [-0.5, -0.5],
        [0.5, -0.5],
        [0, 0.5],
      ]);
      break;
    case 'ring':
      g = new TorusGeometry(0.38, 0.12, 16, 48);
      g.scale(1, 1, 1 / 0.24);
      break;
    case 'arrow':
      g = extruded([
        [-0.5, -0.18],
        [0.1, -0.18],
        [0.1, -0.5],
        [0.5, 0],
        [0.1, 0.5],
        [0.1, 0.18],
        [-0.5, 0.18],
      ]);
      break;
  }
  UNIT.set(shape, g);
  return g;
};

/** 部品の大きさ [幅, 高さ, 奥行き]。作り込んだ物・3D オブジェクトは高さに合わせて縦横比を保つ */
const dimsOf = (part: Part): V3 => {
  if (isBuildBasicShape(part.shape)) {
    return part.size ?? DEFAULT_SIZE[part.shape];
  }
  const natural: readonly [number, number, number] = isBuildProp(part.shape) ? BUILD_PROPS[part.shape].size : TOY_SIZE;
  const k = (part.size?.[1] ?? natural[1]) / natural[1];
  return [natural[0] * k, natural[1] * k, natural[2] * k];
};

/** repeat で並べる1つ1つの位置 (部品の at からのずれ) と出る順番 */
interface Copy {
  x: number;
  z: number;
  order: number;
}

const copiesOf = (part: Part, dims: V3): Copy[] => {
  if (!part.repeat) {
    return [{ x: 0, z: 0, order: 0 }];
  }
  const n = part.repeat.count;
  const cols = part.repeat.columns ?? Math.min(n, Math.ceil(Math.sqrt(n * 2)));
  const gap = part.repeat.gap ?? Math.max(dims[0], dims[2]) * 1.45;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const mid = (cols - 1) / 2;
    return { x: (c - mid) * gap, z: -r * gap, order: r * 2 + Math.abs(c - mid) };
  });
};

/** 部品の箱の8つの角 (向き・傾きを反映したワールド座標)。カメラの自動調整に使う */
const cornersOf = (part: Part, dims: V3, copy: Copy): Vector3[] => {
  const [w, h, d] = dims;
  const turn = new Euler(0, part.turn * DEG, 0);
  const base = new Vector3(part.at[0] + copy.x, part.at[1], part.at[2] + copy.z);
  const list: Vector3[] = [];
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [-0.5, 0.5]) {
      for (const sz of [-0.5, 0.5]) {
        list.push(new Vector3(sx * w, sy * h, sz * d).applyAxisAngle(new Vector3(0, 0, 1), part.tilt * DEG).add(new Vector3(0, h / 2, 0)).applyEuler(turn).add(base));
      }
    }
  }
  return list;
};

/* ---------- 流れ (折れ線) ---------- */

interface Poly {
  points: Vector3[];
  /** 各点までの長さ (累積) */
  acc: number[];
  total: number;
}

const polyOf = (flow: Flow): Poly => {
  const points = flow.path.map((p) => new Vector3(...p));
  if (flow.loop) {
    points.push(points[0].clone());
  }
  const acc = [0];
  for (let i = 1; i < points.length; i++) {
    acc.push(acc[i - 1] + points[i].distanceTo(points[i - 1]));
  }
  return { points, acc, total: Math.max(acc[acc.length - 1], 1e-6) };
};

/** 折れ線の u (0〜1) の位置 */
const pointAt = (poly: Poly, u: number): Vector3 => {
  const len = clamp01(u) * poly.total;
  for (let i = 1; i < poly.points.length; i++) {
    if (len <= poly.acc[i] || i === poly.points.length - 1) {
      const seg = poly.acc[i] - poly.acc[i - 1];
      return poly.points[i - 1].clone().lerp(poly.points[i], seg > 0 ? (len - poly.acc[i - 1]) / seg : 0);
    }
  }
  return poly.points[0].clone();
};

/** 折れ線の始まりから u までの点 */
const partialPoints = (poly: Poly, u: number): Vector3[] => {
  const len = clamp01(u) * poly.total;
  const out = [poly.points[0]];
  for (let i = 1; i < poly.points.length; i++) {
    if (poly.acc[i] < len) {
      out.push(poly.points[i]);
    } else {
      out.push(pointAt(poly, u));
      break;
    }
  }
  return out;
};

const pathOf = (points: Vector3[]) => {
  const path = new CurvePath<Vector3>();
  for (let i = 1; i < points.length; i++) {
    path.add(new LineCurve3(points[i - 1], points[i]));
  }
  return path;
};

/* ---------- カメラ ---------- */

/** 見る向き (注視点からカメラへの向き) */
const VIEW_DIR: Record<Content['camera']['view'], V3> = {
  front: [0.18, 0.32, 1],
  right: [0.55, 0.42, 0.9],
  left: [-0.55, 0.42, 0.9],
  top: [0.15, 1.3, 0.75],
  low: [0.3, 0.06, 1],
};

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const makeProjector = (s: Shot) => {
  const camera = new PerspectiveCamera(FOV, ASPECT, 0.1, 2000);
  camera.position.copy(s.position);
  camera.lookAt(s.target);
  camera.updateMatrixWorld();
  return (p: Vector3) => {
    const v = p.clone().project(camera);
    return { x: ((v.x + 1) / 2) * 1920, y: ((1 - v.y) / 2) * 1080, z: v.z };
  };
};

const shotAt = (target: Vector3, dir: Vector3, dist: number): Shot => ({
  position: target.clone().addScaledVector(dir, dist),
  target: target.clone(),
});

/** points がすべて画面の rect に収まる、いちばん近いカメラ位置 (向きは view で固定) */
const fitShot = (points: Vector3[], view: Content['camera']['view'], rect: Rect): Shot => {
  const dir = new Vector3(...VIEW_DIR[view]).normalize();
  const target = new Box3().setFromPoints(points).getCenter(new Vector3());
  const forward = dir.clone().negate();
  const right = forward.clone().cross(new Vector3(0, 1, 0)).normalize();
  const up = right.clone().cross(forward).normalize();
  let dist = 10;
  for (let pass = 0; pass < 3; pass++) {
    let lo = 0.2;
    let hi = 3000;
    for (let k = 0; k < 40; k++) {
      const mid = Math.sqrt(lo * hi);
      const project = makeProjector(shotAt(target, dir, mid));
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
    const project = makeProjector(shotAt(target, dir, dist));
    const screen = points.map(project);
    const dx = (Math.min(...screen.map((s) => s.x)) + Math.max(...screen.map((s) => s.x))) / 2 - (rect.x0 + rect.x1) / 2;
    const dy = (Math.min(...screen.map((s) => s.y)) + Math.max(...screen.map((s) => s.y))) / 2 - (rect.y0 + rect.y1) / 2;
    const perPx = (2 * dist * Math.tan((FOV * DEG) / 2)) / 1080;
    target.addScaledVector(right, dx * perPx).addScaledVector(up, -dy * perPx);
  }
  return shotAt(target, dir, dist);
};

/* ---------- 注釈の箱の位置 ---------- */

type Box = { x: number; y: number; align: 'left' | 'right' };

/** 指す点が画面の左半分なら左端、右半分なら右端に箱を置き、上下に重ならないよう並べる */
const placeBoxes = (anchors: { x: number; y: number }[], yMin: number): Box[] => {
  const boxes: Box[] = anchors.map((a) => ({ x: a.x < 960 ? 110 : 1810, y: 0, align: a.x < 960 ? 'left' : 'right' }));
  const GAP = 130;
  const Y_MAX = 800;
  for (const side of ['left', 'right'] as const) {
    const idx = anchors.map((_, i) => i).filter((i) => boxes[i].align === side);
    idx.sort((a, b) => anchors[a].y - anchors[b].y);
    let prev = -Infinity;
    for (const i of idx) {
      const y = Math.max(Math.min(Math.max(anchors[i].y - 44, yMin), Y_MAX), prev + GAP);
      boxes[i].y = y;
      prev = y;
    }
    const overflow = prev - Y_MAX;
    if (overflow > 0) {
      for (const i of idx) {
        boxes[i].y = Math.max(yMin, boxes[i].y - overflow);
      }
    }
  }
  return boxes;
};

/** 画面上の点が画面の内側にあるほど 1、外へ 60px 出ると 0 */
const onScreen = (p: { x: number; y: number }): number => {
  const out = Math.max(-p.x, p.x - 1920, -p.y, p.y - 1080);
  return clamp01(1 - out / 60);
};

/* ---------- 部品の描画 ---------- */

const luminance = (hex: string) => {
  const c = new Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

/** 箱・板・円柱の正面 (薄い板なら上面) に書く文字 */
const FaceText: React.FC<{ text: string; shape: BuildBasicShape; dims: V3; bg: string; opacity: number }> = ({
  text,
  shape,
  dims,
  bg,
  opacity,
}) => {
  const ready = useFontsReady();
  const ink = luminance(bg) > 0.45 ? C.ink : '#FFFFFF';
  const texture = useMemo(
    () =>
      canvasTexture(512, 128, (g) => {
        const size = Math.min(96, Math.floor(480 / Math.max(1, [...text].length)));
        g.fillStyle = ink;
        g.font = `700 ${size}px "${SERIF_FONT_FAMILY}"`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, 256, 68);
      }),
    // ready: フォントの読み込み後に描き直す
    [text, ink, ready],
  );
  const [w, h, d] = dims;
  const onTop = shape === 'plate' || h < Math.min(w, d) * 0.25;
  let pw = w * (shape === 'cylinder' ? 0.7 : 0.86);
  let ph = pw / 4;
  const limit = onTop ? d * 0.7 : h * 0.7;
  if (ph > limit) {
    ph = limit;
    pw = ph * 4;
  }
  return (
    <mesh position={onTop ? [0, h / 2 + 0.006, 0] : [0, 0, d / 2 + 0.006]} rotation={onTop ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <planeGeometry args={[pw, ph]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

/** 作り込んだ物 (足もとが原点) */
const PropModel: React.FC<{ shape: keyof typeof BUILD_PROPS; door: number }> = ({ shape, door }) => {
  switch (shape) {
    case 'vendingMachine':
      return <VendingMachine hotRow={2} />;
    case 'vendingMachineOpen':
      return <VendingMachine interior hotRow={2} door={door} />;
    case 'fridge':
      return <Fridge />;
    case 'house':
      return <House />;
    case 'bolt':
      return <Bolt position={[0, 1, 0]} />;
  }
};

const PartView: React.FC<{ part: Part; dims: V3; copies: Copy[]; at: number; unit: number }> = ({ part, dims, copies, at, unit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const [w, h, d] = dims;
  const { focus, dim } = ctx.focusOf(part.id, frame);
  const baseColor = resolveBuildColor(part.color);
  const basic = isBuildBasicShape(part.shape) ? part.shape : null;
  const color = useMemo(
    () => `#${new Color(baseColor ?? C.navyLight).lerp(new Color(C.paper), dim * 0.55).getHexString()}`,
    [baseColor, dim],
  );
  const stagger = copies.length > 1 ? Math.min(4, Math.max(0.6, 50 / copies.length)) : 0;
  const grounded = part.at[1] <= 0.05;

  return (
    <>
      {copies.map((copy, k) => {
        const start = at + copy.order * stagger;
        const since = frame - start;
        if (since < 0) {
          return null;
        }
        const kind = part.enter === 'pop' || part.enter === 'drop' ? SPRINGS.bouncy : SPRINGS.smooth;
        const p = springFrom(frame, start, fps, kind);
        let s = 1;
        let sy = 1;
        let lift = 0;
        let opacity = part.ghost ? GHOST_OPACITY : 1;
        if (part.enter === 'pop') {
          s = Math.max(0.001, p);
        } else if (part.enter === 'drop') {
          lift = Math.max(0, 1 - p) * Math.max(3, h * 2);
          sy = 1 - Math.min(0.15, Math.max(0, p - 1) * 1.2);
          s = Math.min(1, 0.4 + p);
        } else if (part.enter === 'grow') {
          sy = Math.max(0.001, p);
        } else {
          opacity *= clamp01(p);
          // 作り込んだ物・3D オブジェクトは透けさせられないので、小さく出す
          if (!basic) {
            s = Math.max(0.001, clamp01(p));
          }
        }
        let spin = 0;
        if (part.motion === 'spin') {
          spin = since * 0.03;
        } else if (part.motion === 'bob') {
          lift += Math.sin(since / 18 + k) * 0.08 * unit;
        } else if (part.motion === 'pulse') {
          s *= 1 + 0.05 * Math.sin(since / 5);
        }
        s *= 1 + 0.06 * focus;
        const scaleY = s * sy;
        return (
          <group key={k} position={[part.at[0] + copy.x, part.at[1], part.at[2] + copy.z]} rotation={[0, part.turn * DEG, 0]}>
            {basic && grounded && !part.ghost ? (
              <ShadowDisc position={[0.04 * w, 0.005, 0.04 * d]} size={[w * 1.7, d * 1.7]} opacity={clamp01(p)} />
            ) : null}
            <group position={[0, lift + (h / 2) * scaleY, 0]} rotation={[0, spin, part.tilt * DEG]} scale={[s, scaleY, s]}>
              {basic ? (
                <>
                  <Outlined geometry={unitGeometry(basic)} color={color} scale={[w, h, d]} opacity={opacity} />
                  {part.text && (basic === 'box' || basic === 'plate' || basic === 'cylinder') ? (
                    <FaceText text={part.text} shape={basic} dims={dims} bg={color} opacity={Math.min(1, opacity * 3)} />
                  ) : null}
                </>
              ) : (
                <group position={[0, -h / 2, 0]} scale={isBuildProp(part.shape) ? h / BUILD_PROPS[part.shape].size[1] : h / TOY_SIZE[1]}>
                  {isBuildProp(part.shape) ? (
                    <PropModel shape={part.shape} door={springFrom(frame, start + 14, fps, SPRINGS.smooth)} />
                  ) : (
                    <ShapeModel shape={part.shape} color={baseColor} />
                  )}
                </group>
              )}
            </group>
          </group>
        );
      })}
    </>
  );
};

/* ---------- 流れの描画 ---------- */

const FLOW_COLOR: Record<Flow['kind'], string> = {
  heat: '#D98366',
  cold: '#7FA3C9',
  dots: C.navyLight,
  arrow: C.red,
};

type Orbs = ReturnType<typeof useOrbTextures>;

const FlowView: React.FC<{ flow: Flow; at: number; unit: number; orbs: Orbs }> = ({ flow, at, unit, orbs }) => {
  const frame = useCurrentFrame();
  const ctx = useSceneContext();
  const poly = useMemo(() => polyOf(flow), [flow]);
  const { dim } = ctx.focusOf(flow.id, frame);
  const grow = interpolate(frame, [at, at + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eased = 1 - (1 - grow) ** 3;
  const step = Math.round(eased * 40) / 40;
  const arrow = flow.kind === 'arrow';
  const radius = (arrow ? 0.075 : 0.05) * unit;
  const custom = resolveBuildColor(flow.color);
  const pipeColor = flow.kind === 'dots' ? (custom ? C.room : FLOW_COLOR.dots) : (custom ?? FLOW_COLOR[flow.kind]);
  const showPipe = arrow || flow.pipe;

  const tube = useMemo(() => {
    if (step <= 0 || !showPipe) {
      return null;
    }
    const pts = partialPoints(poly, step);
    return pts.length < 2 || pts[0].distanceTo(pts[pts.length - 1]) < 1e-4 ? null : new TubeGeometry(pathOf(pts), 200, radius, 10, false);
  }, [poly, step, radius, showPipe]);

  if (frame < at) {
    return null;
  }
  const opacity = 1 - dim * 0.6;

  // 矢印: 伸びていく管の先に矢じり
  if (arrow) {
    const tip = pointAt(poly, step);
    const back = pointAt(poly, Math.max(0, step - 0.02));
    const dirV = tip.clone().sub(back);
    const dir = dirV.lengthSq() > 1e-10 ? dirV.normalize() : new Vector3(1, 0, 0);
    const headH = radius * 5;
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
    const head = tip.clone().addScaledVector(dir, headH / 2);
    return (
      <>
        {tube ? <Outlined geometry={tube} color={pipeColor} opacity={opacity} noEdges /> : null}
        <group position={head.toArray()} quaternion={quat}>
          <Outlined geometry={unitGeometry('cone')} color={pipeColor} scale={[radius * 4.2, headH, radius * 4.2]} opacity={opacity} />
        </group>
      </>
    );
  }

  // 管の中を玉が流れる。速さは場面の大きさにそろえる
  const n = Math.min(14, Math.max(3, Math.round(poly.total / (unit * 0.9))));
  const du = (0.045 * unit * flow.speed) / poly.total;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const u = (((i / n + (frame - at) * du) % 1) + 1) % 1;
    if (u > step) {
      continue;
    }
    // 一周しない流れは、端で消えて始まりから出直す
    const fade = flow.loop ? 1 : Math.min(1, u * 8, (1 - u) * 8);
    const pos = pointAt(poly, u);
    const o = fade * opacity;
    if (flow.kind === 'heat') {
      items.push(<Billboard key={i} map={i % 3 === 0 ? orbs.heat : orbs.heatPlain} position={pos.toArray()} size={0.46 * unit} opacity={o} />);
    } else if (flow.kind === 'cold') {
      items.push(<Billboard key={i} map={orbs.cold} position={pos.toArray()} size={0.4 * unit} opacity={o} />);
    } else {
      const r = 0.24 * unit;
      items.push(
        <Outlined key={i} geometry={unitGeometry('sphere')} color={custom ?? C.red} position={pos.toArray()} scale={[r, r, r]} opacity={o} noEdges />,
      );
    }
  }
  return (
    <>
      {tube ? <Outlined geometry={tube} color={pipeColor} opacity={opacity * (flow.kind === 'dots' ? 0.85 : 1)} noEdges /> : null}
      {items}
    </>
  );
};

/* ---------- 場面 ---------- */

/** 部品の名札 (部品の上に浮かぶ明朝の札) */
const PartLabel: React.FC<{ text: string; x: number; y: number; opacity: number }> = ({ text, x, y, opacity }) => {
  const theme = useTheme();
  if (opacity <= 0.01) {
    return null;
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -100%) translateY(${(1 - opacity) * 10}px)`,
        opacity,
        fontFamily: theme.fonts.display,
        fontSize: 26,
        fontWeight: 700,
        color: theme.colors.ink,
        backgroundColor: 'rgba(242, 236, 223, 0.92)',
        border: `2px solid ${theme.colors.ink}`,
        padding: '2px 14px 4px',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export const BuildScene: React.FC<{ content: Content }> = ({ content }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ctx = useSceneContext();
  const orbs = useOrbTextures();

  // 部品の大きさ・並べ方・カメラ・注釈の箱は台本だけで決まるので、最初に1回だけ計算する
  const layout = useMemo(() => {
    const parts = content.parts.map((part) => {
      const dims = dimsOf(part);
      const copies = copiesOf(part, dims);
      return { part, dims, copies };
    });
    const polys = new Map(content.flows.map((flow) => [flow.id, polyOf(flow)]));
    const points = [
      ...parts.flatMap(({ part, dims, copies }) => copies.flatMap((copy) => cornersOf(part, dims, copy))),
      ...[...polys.values()].flatMap((poly) => poly.points),
    ];
    const box = new Box3().setFromPoints(points);
    const unit = Math.min(3, Math.max(0.35, box.getSize(new Vector3()).length() / 9));

    const hasCallouts = content.callouts.length > 0;
    const view = content.camera.view;
    const main = fitShot(points, view, {
      x0: hasCallouts ? 500 : 260,
      x1: hasCallouts ? 1420 : 1660,
      y0: content.title ? 250 : 150,
      y1: 860,
    });
    // 寄る先: 部品だけで画面を埋めず、まわりも少し見える大きさ (部品の約2倍の範囲) に収める
    const zoomPart = parts.find(({ part }) => part.id === content.camera.zoomTo);
    const zoom = zoomPart
      ? (() => {
          const corners = cornersOf(zoomPart.part, zoomPart.dims, zoomPart.copies[0]);
          const center = new Box3().setFromPoints(corners).getCenter(new Vector3());
          const around = corners.map((c) => c.clone().sub(center).multiplyScalar(2).add(center));
          return fitShot(around, view, { x0: hasCallouts ? 500 : 320, x1: hasCallouts ? 1420 : 1600, y0: content.title ? 250 : 180, y1: 860 });
        })()
      : null;

    // 注釈が指す点: 部品なら 6 割の高さの中心、流れなら道のりの真ん中
    const anchors = content.callouts.map((c) => {
      const hit = parts.find(({ part }) => part.id === c.target);
      if (hit) {
        return new Vector3(hit.part.at[0], hit.part.at[1] + hit.dims[1] * 0.6, hit.part.at[2]);
      }
      const poly = polys.get(c.target);
      return poly ? pointAt(poly, 0.5) : box.getCenter(new Vector3());
    });
    const project = makeProjector(main);
    const boxes = placeBoxes(
      anchors.map((a) => project(a)),
      content.stat ? 330 : 200,
    );
    return { parts, unit, main, zoom, anchors, boxes };
  }, [content]);

  const drift = interpolate(frame, [ctx.ts.startFrame, ctx.ts.startFrame + ctx.ts.durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const zoomAt = layout.zoom && ctx.isRevealed('zoom') ? ctx.appearAt('zoom') : null;
  const zoomP = zoomAt === null || !layout.zoom ? 0 : springFrom(frame, zoomAt, fps, DOLLY);
  const base = layout.zoom ? lerpShot(layout.main, layout.zoom, zoomP) : layout.main;
  const cameraShot = withDrift(base, drift, 0.1);
  const project = makeProjector(cameraShot);

  const partAt = (i: number) => ctx.appearAt(content.parts[i].id, i);
  const nParts = content.parts.length;

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        flat
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: FOV, near: 0.1, far: 2000, position: cameraShot.position.toArray() }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <CameraRig shot={cameraShot} />
        <Lights />
        {layout.parts.map(({ part, dims, copies }, i) => (
          <PartView key={part.id} part={part} dims={dims} copies={copies} at={partAt(i)} unit={layout.unit} />
        ))}
        {content.flows.map((flow, i) => (
          <FlowView key={flow.id} flow={flow} at={ctx.appearAt(flow.id, nParts + i)} unit={layout.unit} orbs={orbs} />
        ))}
      </ThreeCanvas>

      {layout.parts.map(({ part, dims }, i) => {
        if (!part.label) {
          return null;
        }
        const top = project(new Vector3(part.at[0], part.at[1] + dims[1] + 0.12 * layout.unit, part.at[2]));
        const shown = interpolate(frame, [partAt(i) + 6, partAt(i) + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        // 寄ったら、寄った先以外の名札は消す (大きく写った物と重なるので)
        const zoomFade = part.id === content.camera.zoomTo ? 1 : 1 - zoomP;
        const opacity = shown * zoomFade * (1 - ctx.focusOf(part.id, frame).dim * 0.5) * onScreen(top);
        return <PartLabel key={part.id} text={part.label} x={top.x} y={top.y} opacity={opacity} />;
      })}
      {content.callouts.map((callout, i) => {
        // 注釈は reveal されたときに出す (reveal がなければ部品・流れのあとに順に出す)
        const at = ctx.appearAt(callout.id, nParts + content.flows.length + i);
        const anchor = project(layout.anchors[i]);
        // 寄って指す先が画面の外へ出たら、注釈も消す
        const opacity = onScreen(anchor);
        return opacity <= 0.01 ? null : (
          <AbsoluteFill key={callout.id} style={{ opacity }}>
            <Callout callout={callout} anchor={anchor} box={layout.boxes[i]} at={at} />
          </AbsoluteFill>
        );
      })}
      {content.title ? <TitleOverlay text={content.title} at={ctx.appearAt('title', 1)} /> : null}
      {content.stat ? <StatOverlay stat={content.stat} at={ctx.appearAt('stat', 3)} place={{ align: 'right', x: 1850, y: 110 }} /> : null}
    </AbsoluteFill>
  );
};
