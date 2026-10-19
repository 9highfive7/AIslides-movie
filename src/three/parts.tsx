import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { CanvasTexture, EdgesGeometry, SRGBColorSpace, type BufferGeometry, type Texture } from 'three';
import { SERIF_FONT_FAMILY } from '../themes';

/**
 * 3D の場面で使い回す部品。
 * 絵本のイラストのように「ベタ塗りの面 + 黒い輪郭線」で描き、paper テーマの紺・朱・墨に合わせる。
 */

export const C = {
  ink: '#24211C',
  outline: '#1C1F26',
  navy: '#3F5F86',
  navyDark: '#2F4A6B',
  navyLight: '#5B7DA6',
  paper: '#F2ECDF',
  red: '#C63A2B',
  orange: '#E2763A',
  cold: '#C9D7E8',
  hot: '#F0C8BC',
  room: '#DCD3BF',
  gold: '#E8C35A',
} as const;

/** 面 + 輪郭線。geometry は呼び出し側で useMemo しておく */
export const Outlined: React.FC<{
  geometry: BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  map?: Texture | null;
  opacity?: number;
  /** 輪郭線を出さない (遠景の小物など) */
  noEdges?: boolean;
}> = ({ geometry, color, position, rotation, scale, map, opacity = 1, noEdges }) => {
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry]);
  const transparent = opacity < 1;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry}>
        <meshLambertMaterial color={map ? '#FFFFFF' : color} map={map ?? null} transparent={transparent} opacity={opacity} />
      </mesh>
      {noEdges ? null : (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={C.outline} transparent={transparent} opacity={opacity} />
        </lineSegments>
      )}
    </group>
  );
};

/** Canvas に描いた絵をテクスチャにする */
export const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d') as CanvasRenderingContext2D);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

/**
 * テクスチャに文字を描く前に、明朝体の読み込みを待つ。
 * 読み込み前に描くと代替フォントのまま固まるので、読み込むまでレンダリングを止める。
 */
export const useFontsReady = (): boolean => {
  const probe = `900 64px "${SERIF_FONT_FAMILY}"`;
  const [ready, setReady] = useState(() => document.fonts.check(probe) && document.fonts.size > 0);
  const [handle] = useState(() => (ready ? null : delayRender('3D の文字テクスチャ用のフォントを待つ')));
  useEffect(() => {
    if (ready) {
      return;
    }
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      // ensureFonts が FontFace を登録し終えたら check が true になる (最大約5秒待つ)
      if ([...document.fonts].some((f) => f.family.replace(/"/g, '') === SERIF_FONT_FAMILY && f.status === 'loaded') || tries > 100) {
        clearInterval(timer);
        setReady(true);
        if (handle !== null) {
          continueRender(handle);
        }
      }
    }, 50);
    return () => clearInterval(timer);
  }, [ready, handle]);
  return ready;
};

const ORB = 256;

/** 熱の玉: 朱色の玉 + まわりの光 + ゆらめく湯気 + 「熱」 */
const drawHeatOrb = (g: CanvasRenderingContext2D, label: boolean) => {
  const cx = ORB / 2;
  const cy = ORB * 0.58;
  const r = ORB * 0.22;
  const glow = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2);
  glow.addColorStop(0, 'rgba(226, 118, 58, 0.45)');
  glow.addColorStop(1, 'rgba(226, 118, 58, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, ORB, ORB);
  g.strokeStyle = C.red;
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (const dx of [-0.45, 0, 0.45]) {
    const x = cx + dx * r;
    const y0 = cy - r * 1.3;
    g.beginPath();
    g.moveTo(x, y0);
    g.quadraticCurveTo(x + r * 0.2, y0 - r * 0.25, x, y0 - r * 0.5);
    g.quadraticCurveTo(x - r * 0.2, y0 - r * 0.75, x, y0 - r);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = C.red;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = C.ink;
  g.stroke();
  if (label) {
    g.fillStyle = '#FFFFFF';
    g.font = `900 ${Math.round(r * 1.05)}px "${SERIF_FONT_FAMILY}"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('熱', cx, cy + r * 0.05);
  }
};

/** 冷たさの玉: 紺の玉 + 雪の結晶 */
const drawColdOrb = (g: CanvasRenderingContext2D) => {
  const cx = ORB / 2;
  const cy = ORB / 2;
  const r = ORB * 0.24;
  g.beginPath();
  g.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
  g.fillStyle = 'rgba(91, 125, 166, 0.22)';
  g.fill();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fillStyle = C.navy;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = C.ink;
  g.stroke();
  g.strokeStyle = '#FFFFFF';
  g.lineWidth = 8;
  g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const ex = cx + Math.cos(a) * r * 0.62;
    const ey = cy + Math.sin(a) * r * 0.62;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(ex, ey);
    g.stroke();
    // 枝
    for (const s of [-1, 1]) {
      const bx = cx + Math.cos(a) * r * 0.4;
      const by = cy + Math.sin(a) * r * 0.4;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(a + s * 0.8) * r * 0.18, by + Math.sin(a + s * 0.8) * r * 0.18);
      g.stroke();
    }
  }
};

export const useOrbTextures = () => {
  const ready = useFontsReady();
  return useMemo(
    () => ({
      heat: canvasTexture(ORB, ORB, (g) => drawHeatOrb(g, ready)),
      heatPlain: canvasTexture(ORB, ORB, (g) => drawHeatOrb(g, false)),
      cold: canvasTexture(ORB, ORB, drawColdOrb),
    }),
    [ready],
  );
};

/** いつもカメラの方を向く平面の絵 (熱・冷たさの玉) */
export const Billboard: React.FC<{
  map: Texture;
  position: [number, number, number];
  size: number;
  opacity?: number;
}> = ({ map, position, size, opacity = 1 }) =>
  opacity <= 0.001 ? null : (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={map} transparent opacity={opacity} depthWrite={false} />
    </sprite>
  );

/** 足もとの柔らかい影 (地面に置く円形のぼかし) */
const shadowTexture = (() => {
  let cached: CanvasTexture | null = null;
  return () => {
    if (!cached) {
      cached = canvasTexture(128, 128, (g) => {
        const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
        grad.addColorStop(0, 'rgba(36, 33, 28, 0.32)');
        grad.addColorStop(1, 'rgba(36, 33, 28, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 128, 128);
      });
    }
    return cached;
  };
})();

export const ShadowDisc: React.FC<{ position: [number, number, number]; size: [number, number]; opacity?: number }> = ({
  position,
  size,
  opacity = 1,
}) => (
  <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={size} />
    <meshBasicMaterial map={shadowTexture()} transparent opacity={opacity} depthWrite={false} />
  </mesh>
);

/** 3D の場面に共通の照明 */
export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={1.6} />
    <directionalLight position={[-6, 14, 8]} intensity={1.5} />
  </>
);
