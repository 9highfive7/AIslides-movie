import React, { useMemo } from 'react';
import {
  BoxGeometry,
  CurvePath,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  LineCurve3,
  MeshLambertMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Shape,
  TubeGeometry,
  Vector3,
  type Texture,
} from 'three';
import { SERIF_FONT_FAMILY } from '../themes';
import { C, Outlined, ShadowDisc, canvasTexture, useFontsReady } from './parts';

/**
 * 3D の物 (自販機・冷蔵庫・家・稲妻・カレンダー)。
 * 原点は物の足もとの中心。単位はおおよそ m。
 */

export const VM = { W: 1.8, H: 3.2, D: 1.4 } as const;

const DRINKS = ['#C9503F', '#E8D8B0', '#4E7FB0', '#6E9A6A', '#B98A4A', '#7A5C8E'];

/** 自販機の正面の絵 (見本の缶とペットボトル・値札・ボタン・硬貨口・取り出し口) */
const drawVendingFront = (g: CanvasRenderingContext2D, hotRow: number | null) => {
  const w = 512;
  const h = 910;
  const sx = w / 360;
  const sy = h / 640;
  g.scale(sx, sy);
  g.lineJoin = 'round';
  const box = (x: number, y: number, bw: number, bh: number, fill: string, lw = 3) => {
    g.fillStyle = fill;
    g.fillRect(x, y, bw, bh);
    g.lineWidth = lw;
    g.strokeStyle = C.ink;
    g.strokeRect(x, y, bw, bh);
  };
  box(0, 0, 360, 640, C.navy, 6);
  box(22, 24, 316, 350, C.paper);
  for (let r = 0; r < 3; r++) {
    const rowY = 50 + r * 108;
    for (let c = 0; c < 5; c++) {
      const cx = 40 + c * 58;
      const fill = DRINKS[(r * 2 + c) % DRINKS.length];
      if (c % 2 === 0) {
        box(cx, rowY + 6, 38, 58, fill, 2.5);
        box(cx + 4, rowY, 30, 9, '#CFC6B4', 2);
      } else {
        g.beginPath();
        g.moveTo(cx + 13, rowY - 4);
        g.lineTo(cx + 25, rowY - 4);
        g.lineTo(cx + 25, rowY + 8);
        g.quadraticCurveTo(cx + 38, rowY + 14, cx + 38, rowY + 24);
        g.lineTo(cx + 38, rowY + 64);
        g.lineTo(cx, rowY + 64);
        g.lineTo(cx, rowY + 24);
        g.quadraticCurveTo(cx, rowY + 14, cx + 13, rowY + 8);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.lineWidth = 2.5;
        g.strokeStyle = C.ink;
        g.stroke();
        g.fillStyle = C.ink;
        g.fillRect(cx + 12, rowY - 10, 14, 7);
      }
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(cx + 4, rowY + 30, 30, 12);
      box(cx - 2, rowY + 72, 42, 14, '#FFFFFF', 1.5);
      box(cx + 12, rowY + 90, 16, 9, hotRow === r ? C.red : C.navyLight, 1.5);
    }
  }
  box(22, 394, 210, 112, C.navyDark, 2.5);
  g.fillStyle = C.navyLight;
  g.fillRect(40, 414, 174, 16);
  g.globalAlpha = 0.6;
  g.fillRect(40, 440, 140, 10);
  g.globalAlpha = 1;
  box(244, 394, 94, 112, C.paper, 2.5);
  g.fillStyle = C.ink;
  g.fillRect(256, 406, 70, 24);
  g.fillStyle = '#E8C35A';
  g.font = '700 16px sans-serif';
  g.textAlign = 'center';
  g.fillText('120', 291, 424);
  g.fillStyle = C.ink;
  g.fillRect(284, 442, 14, 40);
  g.beginPath();
  g.arc(314, 462, 9, 0, Math.PI * 2);
  g.fillStyle = '#CFC6B4';
  g.fill();
  g.stroke();
  box(22, 526, 316, 84, C.ink, 2.5);
  g.fillStyle = '#3A3630';
  g.fillRect(34, 538, 292, 40);
};

const frontCache = new Map<string, Texture>();
const vendingFront = (hotRow: number | null): Texture => {
  const key = String(hotRow);
  let t = frontCache.get(key);
  if (!t) {
    t = canvasTexture(512, 910, (g) => drawVendingFront(g, hotRow));
    frontCache.set(key, t);
  }
  return t;
};

/** 室の上に貼る「つめた〜い」「あったか〜い」の札 */
const useSignTextures = () => {
  const ready = useFontsReady();
  return useMemo(() => {
    const sign = (text: string, color: string) =>
      canvasTexture(256, 64, (g) => {
        g.fillStyle = C.paper;
        g.fillRect(0, 0, 256, 64);
        g.lineWidth = 4;
        g.strokeStyle = C.ink;
        g.strokeRect(2, 2, 252, 60);
        g.fillStyle = color;
        g.font = `700 ${ready ? 34 : 30}px "${SERIF_FONT_FAMILY}"`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, 128, 34);
      });
    return { cold: sign('つめた〜い', C.navy), hot: sign('あったか〜い', C.red) };
  }, [ready]);
};

/* ---------- 冷媒の管 (ヒートポンプ) ---------- */

const PIPE_Z = 0.25;
const P = (x: number, y: number) => new Vector3(x, y, PIPE_Z);
const zigzag = (x: number, dx: number) =>
  [1.55, 1.75, 1.95, 2.15, 2.35, 2.55].map((y, i) => P(x + (i % 2 === 0 ? dx : -dx), y));

/** 圧縮機 → 温かい室のコイル (放熱) → 膨張弁 → 冷たい室のコイル (吸熱) → 圧縮機 */
const HOT_POINTS = [P(0.16, 0.62), P(0.38, 0.62), P(0.38, 1.4), ...zigzag(0.38, 0.08), P(0.38, 2.75), P(0.38, 2.88), P(0.84, 2.88), P(0.84, 0.3), P(0.3, 0.3)];
const COLD_POINTS = [P(0.14, 0.3), P(-0.38, 0.3), P(-0.38, 1.4), ...zigzag(-0.38, 0.08), P(-0.38, 2.75), P(-0.38, 2.88), P(-0.84, 2.88), P(-0.84, 0.55), P(-0.16, 0.55)];
export const VALVE = P(0.22, 0.3);
export const COMPRESSOR = new Vector3(0, 0.45, 0.1);

const pathOf = (points: Vector3[]) => {
  const path = new CurvePath<Vector3>();
  for (let i = 1; i < points.length; i++) {
    path.add(new LineCurve3(points[i - 1], points[i]));
  }
  return path;
};

/** 管を一周する経路 (熱の玉を流すのに使う) と、各区間の境目 [0..1] */
export const PIPE_LOOP = (() => {
  const all = [...HOT_POINTS, VALVE, ...COLD_POINTS, HOT_POINTS[0]];
  const path = pathOf(all);
  const lengths = path.getCurveLengths();
  const total = path.getLength();
  const at = (index: number) => (index === 0 ? 0 : lengths[index - 1] / total);
  return {
    path,
    hotCoil: [at(2), at(9)] as const,
    valve: at(HOT_POINTS.length),
    coldCoil: [at(HOT_POINTS.length + 3), at(HOT_POINTS.length + 10)] as const,
  };
})();

/** 自販機の中身: 冷たい室 ×2・温かい室・機械室・冷媒の管 */
const VendingInterior: React.FC = () => {
  const signs = useSignTextures();
  const geo = useMemo(
    () => ({
      back: new BoxGeometry(0.52, 1.75, 0.03),
      shelf: new BoxGeometry(0.52, 0.03, 0.75),
      can: new CylinderGeometry(0.075, 0.075, 0.22, 20),
      roomBack: new BoxGeometry(1.68, 1.1, 0.03),
      slab: new BoxGeometry(1.68, 0.06, 1.2),
      compressor: new CylinderGeometry(0.16, 0.16, 0.5, 24),
      valve: new OctahedronGeometry(0.07),
      sign: new PlaneGeometry(0.46, 0.115),
      hotTube: new TubeGeometry(pathOf(HOT_POINTS), 200, 0.03, 8, false),
      coldTube: new TubeGeometry(pathOf(COLD_POINTS), 200, 0.03, 8, false),
    }),
    [],
  );
  const columns = [
    { x: -0.56, fill: C.cold, can: '#7FA3C9', sign: signs.cold, cans: [-0.75, -0.56] },
    { x: 0, fill: C.cold, can: '#7FA3C9', sign: signs.cold, cans: [-0.12, 0.12] },
    { x: 0.56, fill: C.hot, can: '#D98366', sign: signs.hot, cans: [0.58, 0.76] },
  ];
  return (
    <group>
      {columns.map((col, i) => (
        <group key={i}>
          <Outlined geometry={geo.back} color={col.fill} position={[col.x, 2.125, -0.6]} />
          {[1.3, 1.85, 2.4].map((y) => (
            <group key={y}>
              <Outlined geometry={geo.shelf} color={col.fill} position={[col.x, y, -0.22]} />
              {col.cans.map((x) => (
                <Outlined key={x} geometry={geo.can} color={col.can} position={[x, y + 0.125, -0.2]} />
              ))}
            </group>
          ))}
          <mesh geometry={geo.sign} position={[col.x, 2.88, -0.58]}>
            <meshBasicMaterial map={col.sign} />
          </mesh>
        </group>
      ))}
      <Outlined geometry={geo.slab} color={C.room} position={[0, 1.2, -0.05]} />
      <Outlined geometry={geo.roomBack} color={C.room} position={[0, 0.62, -0.6]} />
      <Outlined geometry={geo.compressor} color={C.ink} position={COMPRESSOR.toArray()} />
      <Outlined geometry={geo.valve} color={C.navy} position={VALVE.toArray()} />
      <mesh geometry={geo.hotTube}>
        <meshLambertMaterial color="#D98366" />
      </mesh>
      <mesh geometry={geo.coldTube}>
        <meshLambertMaterial color={C.navyLight} />
      </mesh>
    </group>
  );
};

/** 扉: 正面に絵を貼った板。左端を軸に手前へ開く */
const Door: React.FC<{ open: number; hotRow: number | null }> = ({ open, hotRow }) => {
  const { W, H, D } = VM;
  const geometry = useMemo(() => new BoxGeometry(W, H - 0.06, 0.08), [W, H]);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);
  const materials = useMemo(() => {
    const plain = new MeshLambertMaterial({ color: C.navy });
    const front = new MeshLambertMaterial({ map: vendingFront(hotRow) });
    return [plain, plain, plain, plain, front, new MeshLambertMaterial({ color: C.navyDark })];
  }, [hotRow]);
  return (
    <group position={[-W / 2, 0, D / 2]} rotation={[0, -2.2 * open, 0]}>
      <group position={[W / 2, H / 2, -0.04]}>
        <mesh geometry={geometry} material={materials} />
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={C.outline} />
        </lineSegments>
      </group>
    </group>
  );
};

/**
 * 自販機。interior を true にすると中身を作り、door (0→1) で扉が開いて中が見える。
 * 遠景に並べる自販機は interior なし (箱と扉だけ) で軽くする。
 */
export const VendingMachine: React.FC<{
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  door?: number;
  interior?: boolean;
  hotRow?: number | null;
  noEdges?: boolean;
}> = ({ position, rotationY = 0, scale = 1, door = 0, interior = false, hotRow = null, noEdges }) => {
  const { W, H, D } = VM;
  const geo = useMemo(
    () => ({
      solid: new BoxGeometry(W, H, D - 0.08),
      back: new BoxGeometry(W, H, 0.06),
      side: new BoxGeometry(0.06, H, D - 0.08),
      cap: new BoxGeometry(W, 0.06, D - 0.08),
    }),
    [W, H, D],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <ShadowDisc position={[0.1, 0.005, 0.1]} size={[W * 1.8, D * 1.9]} />
      {interior ? (
        <>
          <Outlined geometry={geo.back} color={C.navyDark} position={[0, H / 2, -D / 2 + 0.03]} />
          <Outlined geometry={geo.side} color={C.navyDark} position={[-W / 2 + 0.03, H / 2, -0.04]} />
          <Outlined geometry={geo.side} color={C.navyDark} position={[W / 2 - 0.03, H / 2, -0.04]} />
          <Outlined geometry={geo.cap} color={C.navyLight} position={[0, H - 0.03, -0.04]} />
          <Outlined geometry={geo.cap} color={C.navyDark} position={[0, 0.03, -0.04]} />
          <VendingInterior />
        </>
      ) : (
        <Outlined geometry={geo.solid} color={C.navyDark} position={[0, H / 2, -0.04]} noEdges={noEdges} />
      )}
      <Door open={door} hotRow={hotRow} />
    </group>
  );
};

/** 冷蔵庫 (冷やすだけの比較用) */
export const Fridge: React.FC<{ position?: [number, number, number]; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const geo = useMemo(
    () => ({
      body: new BoxGeometry(1.2, 2.3, 0.95),
      top: new BoxGeometry(1.2, 0.72, 0.08),
      bottom: new BoxGeometry(1.2, 1.52, 0.08),
      handle: new BoxGeometry(0.06, 0.4, 0.06),
    }),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <ShadowDisc position={[0.1, 0.005, 0.1]} size={[2.2, 1.9]} />
      <Outlined geometry={geo.body} color="#C2D0E0" position={[0, 1.15, 0]} />
      <Outlined geometry={geo.top} color={C.cold} position={[0, 1.93, 0.5]} />
      <Outlined geometry={geo.bottom} color={C.cold} position={[0, 0.79, 0.5]} />
      <Outlined geometry={geo.handle} color={C.ink} position={[0.48, 1.85, 0.58]} />
      <Outlined geometry={geo.handle} color={C.ink} position={[0.48, 1.25, 0.58]} />
    </group>
  );
};

/** 家 (一般家庭のたとえ) */
export const House: React.FC<{ position?: [number, number, number]; rotationY?: number; scale?: number }> = ({
  position,
  rotationY = 0,
  scale = 1,
}) => {
  const geo = useMemo(() => {
    const tri = new Shape();
    tri.moveTo(-1.2, 0);
    tri.lineTo(1.2, 0);
    tri.lineTo(0, 1.0);
    tri.closePath();
    const roof = new ExtrudeGeometry(tri, { depth: 1.8, bevelEnabled: false });
    roof.translate(0, 0, -0.9);
    return {
      body: new BoxGeometry(2.0, 1.6, 1.6),
      roof,
      door: new BoxGeometry(0.45, 0.85, 0.05),
      window: new BoxGeometry(0.5, 0.45, 0.05),
    };
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <ShadowDisc position={[0.1, 0.005, 0.1]} size={[3.4, 2.8]} />
      <Outlined geometry={geo.body} color={C.paper} position={[0, 0.8, 0]} />
      <Outlined geometry={geo.roof} color={C.red} position={[0, 1.6, 0]} />
      <Outlined geometry={geo.door} color={C.navy} position={[0.45, 0.43, 0.81]} />
      <Outlined geometry={geo.window} color={C.cold} position={[-0.45, 0.95, 0.81]} />
    </group>
  );
};

/** 稲妻 (電気) */
export const Bolt: React.FC<{ position?: [number, number, number]; rotationY?: number; scale?: number }> = ({
  position,
  rotationY = 0,
  scale = 1,
}) => {
  const geometry = useMemo(() => {
    const pts: [number, number][] = [[30, 0], [0, 55], [24, 55], [12, 100], [52, 38], [28, 38], [42, 0]];
    const s = new Shape();
    pts.forEach(([x, y], i) => (i === 0 ? s.moveTo((x - 26) / 50, (50 - y) / 50) : s.lineTo((x - 26) / 50, (50 - y) / 50)));
    s.closePath();
    const g = new ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false });
    g.translate(0, 0, -0.11);
    return g;
  }, []);
  return <Outlined geometry={geometry} color={C.gold} position={position} rotation={[0, rotationY, 0]} scale={scale} />;
};

/** カレンダーの1枚。flip (0→1) で裏返ると朱色の面 (使った月) になる */
export const CalendarTile: React.FC<{ month: number; position: [number, number, number]; flip: number }> = ({
  month,
  position,
  flip,
}) => {
  const ready = useFontsReady();
  const geometry = useMemo(() => new BoxGeometry(0.5, 0.56, 0.04), []);
  const edges = useMemo(() => new EdgesGeometry(geometry), [geometry]);
  const materials = useMemo(() => {
    const face = (bg: string, band: string, ink: string) =>
      new MeshLambertMaterial({
        map: canvasTexture(128, 144, (g) => {
          g.fillStyle = bg;
          g.fillRect(0, 0, 128, 144);
          g.fillStyle = band;
          g.fillRect(0, 0, 128, 30);
          g.fillStyle = ink;
          g.font = `700 ${ready ? 64 : 56}px "${SERIF_FONT_FAMILY}"`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(month), 64, 92);
        }),
      });
    const side = new MeshLambertMaterial({ color: C.room });
    return [side, side, side, side, face(C.paper, C.room, 'rgba(36,33,28,0.55)'), face(C.red, '#9E2E22', '#FFFFFF')];
  }, [month, ready]);
  return (
    <group position={position} rotation={[0, Math.PI * flip, 0]}>
      <mesh geometry={geometry} material={materials} />
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={C.outline} />
      </lineSegments>
    </group>
  );
};
