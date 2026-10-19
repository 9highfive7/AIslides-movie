import React, { createContext, useContext, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * 3D オブジェクトの部品。アニメ調 (トゥーン) の陰影 + 黒い輪郭線で、
 * 絵本やアニメのような「くっきりした立体」に見せる。
 */

export type V3 = [number, number, number];

/** 輪郭線の色と太さ (ワールド座標) */
const OUTLINE_COLOR = '#2B2D42';
const OUTLINE_WIDTH = 0.028;

/** 薄くしたとき (他の要素の強調中) に寄せる色 */
const DIM_TARGET = new THREE.Color('#C9D3E0');

let gradientMap: THREE.DataTexture | null = null;

/** 3段階の陰影 (セル画風)。明るい面・中間・影の3色になる */
export const toonGradient = (): THREE.DataTexture => {
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
};

let outlineMaterial: THREE.MeshBasicMaterial | null = null;
const getOutlineMaterial = (): THREE.MeshBasicMaterial => {
  if (!outlineMaterial) {
    outlineMaterial = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
  }
  return outlineMaterial;
};

/**
 * 形 (ジオメトリ) のキャッシュ。同じ引数の形は1つを使い回す
 * (毎フレーム作り直さない / 同じ物を count 個並べても軽い)。
 */
const geometryCache = new Map<string, THREE.BufferGeometry>();
const cached = (key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry => {
  let geo = geometryCache.get(key);
  if (!geo) {
    geo = make();
    geo.computeBoundingBox();
    geometryCache.set(key, geo);
  }
  return geo;
};

/** 平面の図形 (星・ハートなど) を厚みのある立体にする。中心は原点 */
const extruded = (key: string, shape: () => THREE.Shape, depth: number, bevel = 0.05): THREE.BufferGeometry =>
  cached(`extrude:${key}:${depth}:${bevel}`, () => {
    const geo = new THREE.ExtrudeGeometry(shape(), {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  });

export const G = {
  box: (w: number, h: number, d: number) => cached(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
  /** 角の丸い箱 (おもちゃのブロックのような見た目) */
  rbox: (w: number, h: number, d: number, r = 0.08) =>
    cached(`rbox:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2))),
  sphere: (r: number) => cached(`sphere:${r}`, () => new THREE.SphereGeometry(r, 40, 28)),
  cylinder: (rt: number, rb: number, h: number, seg = 40) =>
    cached(`cyl:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r: number, h: number, seg = 40) => cached(`cone:${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  torus: (R: number, tube: number, arc = Math.PI * 2) =>
    cached(`torus:${R}:${tube}:${arc}`, () => new THREE.TorusGeometry(R, tube, 18, 56, arc)),
  capsule: (r: number, len: number) => cached(`capsule:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 24)),
  /** 回転体 (しずく・電球・トロフィーなど)。points は [半径, 高さ] の列 */
  lathe: (key: string, points: Array<[number, number]>) =>
    cached(`lathe:${key}`, () => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 40)),
  /** 曲線に沿った管 (はてなマーク・チェックマーク・矢印の線など) */
  tube: (key: string, curve: () => THREE.Curve<THREE.Vector3>, radius: number) =>
    cached(`tube:${key}:${radius}`, () => new THREE.TubeGeometry(curve(), 64, radius, 16, false)),
  star: (outer = 0.85, inner = 0.38, depth = 0.28) =>
    extruded(`star:${outer}:${inner}`, () => {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i === 0) {
          s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        } else {
          s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      }
      s.closePath();
      return s;
    }, depth),
  heart: (depth = 0.3) =>
    extruded('heart', () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.75);
      s.bezierCurveTo(-0.15, -0.55, -0.85, -0.15, -0.85, 0.25);
      s.bezierCurveTo(-0.85, 0.65, -0.4, 0.8, 0, 0.45);
      s.bezierCurveTo(0.4, 0.8, 0.85, 0.65, 0.85, 0.25);
      s.bezierCurveTo(0.85, -0.15, 0.15, -0.55, 0, -0.75);
      return s;
    }, depth),
  arrow: (depth = 0.3) =>
    extruded('arrow', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.22, -0.8);
      s.lineTo(0.22, -0.8);
      s.lineTo(0.22, 0.1);
      s.lineTo(0.6, 0.1);
      s.lineTo(0, 0.8);
      s.lineTo(-0.6, 0.1);
      s.lineTo(-0.22, 0.1);
      s.closePath();
      return s;
    }, depth),
  crescent: (depth = 0.3) =>
    extruded('crescent', () => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.75, Math.PI * 0.35, Math.PI * 1.65, false);
      s.absarc(0.32, 0, 0.6, Math.PI * 1.45, Math.PI * 0.55, true);
      return s;
    }, depth),
  triangle: (w: number, h: number, depth: number) =>
    extruded(`tri:${w}:${h}`, () => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0);
      s.lineTo(w / 2, 0);
      s.lineTo(0, -h);
      s.closePath();
      return s;
    }, depth, 0.01),
};

/**
 * 薄くする度合い (dim) と光らせる度合い (glow)。scene3d のフォーカス演出で、
 * 説明中の物以外を淡くし、説明中の物を少し明るくする。
 */
export const ToneContext = createContext<{ dim: number; glow: number }>({ dim: 0, glow: 0 });

export const Part: React.FC<{
  geo: THREE.BufferGeometry;
  color: string;
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  /** 輪郭線を付けるか (細かい飾りは false にすると軽い) */
  outline?: boolean;
  /** 自分で光る物 (太陽・電球・炎など) の明るさ 0〜1 */
  emissive?: number;
  opacity?: number;
}> = ({ geo, color, position, rotation, scale, outline = true, emissive = 0, opacity = 1 }) => {
  const tone = useContext(ToneContext);
  const base = useMemo(() => new THREE.Color(color), [color]);
  const shown = useMemo(() => base.clone().lerp(DIM_TARGET, tone.dim * 0.45), [base, tone.dim]);

  // 輪郭線: 少し大きくした裏面を黒で描く (inverted hull)。中心がずれた形でも太さが揃うよう補正する
  const hull = useMemo(() => {
    const box = geo.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geo.getAttribute('position') as THREE.BufferAttribute);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = new THREE.Vector3(
      1 + (2 * OUTLINE_WIDTH) / Math.max(size.x, 0.02),
      1 + (2 * OUTLINE_WIDTH) / Math.max(size.y, 0.02),
      1 + (2 * OUTLINE_WIDTH) / Math.max(size.z, 0.02),
    );
    const offset = new THREE.Vector3(center.x * (1 - s.x), center.y * (1 - s.y), center.z * (1 - s.z));
    return { scale: s.toArray() as V3, offset: offset.toArray() as V3 };
  }, [geo]);

  const glow = emissive + tone.glow * 0.18;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshToonMaterial
          color={shown}
          gradientMap={toonGradient()}
          emissive={shown}
          emissiveIntensity={glow}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {outline && opacity >= 1 ? (
        <mesh geometry={geo} material={getOutlineMaterial()} scale={hull.scale} position={hull.offset} />
      ) : null}
    </group>
  );
};

/** 影なしのやわらかい光 (タイトルなどに浮かぶオブジェクト・サムネイル用) */
export const ToyLights: React.FC = () => (
  <>
    <ambientLight intensity={1.0} />
    <hemisphereLight args={['#FFFFFF', '#B9C6D8', 0.35]} />
    <directionalLight position={[4, 6, 10]} intensity={1.5} />
  </>
);

/** 顔 (目・ほっぺ・口)。z は顔を付ける面の手前の位置、w は顔の幅 */
export const Face: React.FC<{ y: number; z: number; w?: number; mood?: 'smile' | 'calm' }> = ({
  y,
  z,
  w = 0.5,
  mood = 'smile',
}) => {
  const eye = w * 0.11;
  return (
    <group position={[0, y, z]}>
      <Part geo={G.sphere(eye)} color="#2B2D42" position={[-w * 0.32, w * 0.08, 0]} scale={[1, 1.3, 0.6]} outline={false} />
      <Part geo={G.sphere(eye)} color="#2B2D42" position={[w * 0.32, w * 0.08, 0]} scale={[1, 1.3, 0.6]} outline={false} />
      <Part geo={G.sphere(eye * 0.35)} color="#FFFFFF" position={[-w * 0.29, w * 0.13, eye * 0.5]} outline={false} />
      <Part geo={G.sphere(eye * 0.35)} color="#FFFFFF" position={[w * 0.35, w * 0.13, eye * 0.5]} outline={false} />
      <Part geo={G.sphere(eye * 1.1)} color="#FF8FA3" position={[-w * 0.52, -w * 0.12, -eye * 0.3]} scale={[1.2, 0.7, 0.4]} outline={false} />
      <Part geo={G.sphere(eye * 1.1)} color="#FF8FA3" position={[w * 0.52, -w * 0.12, -eye * 0.3]} scale={[1.2, 0.7, 0.4]} outline={false} />
      {mood === 'smile' ? (
        <Part
          geo={G.torus(w * 0.14, w * 0.035, Math.PI)}
          color="#2B2D42"
          position={[0, -w * 0.08, 0]}
          rotation={[0, 0, Math.PI]}
          outline={false}
        />
      ) : (
        <Part geo={G.capsule(w * 0.03, w * 0.14)} color="#2B2D42" position={[0, -w * 0.12, 0]} rotation={[0, 0, Math.PI / 2]} outline={false} />
      )}
    </group>
  );
};
