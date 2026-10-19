import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { shade, useTheme } from '../themes';

/**
 * シーンの背景。各シーンが自前で不透明な背景を持つので、
 * スライド系のトランジションでも背景ごと入れ替わる。
 * animated のときは模様と図形がゆっくり漂う (YouTube 向けの「止まって見えない」画面)。
 * mode: "3d" は空 + 奥へ続く床 + 回転する積み木とボール、"stage" は空だけ (scene3d の舞台用)。
 */
export const SceneBackground: React.FC<{
  variant: 'light' | 'dark';
  animated: boolean;
  seed: number;
  mode?: 'flat' | '3d' | 'stage';
  /** 3D の背景で積み木とボールを回すか */
  toys?: boolean;
}> = ({ variant, animated, seed, mode = 'flat', toys = true }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const t = animated ? frame : 0;

  if (variant === 'dark') {
    return (
      <AbsoluteFill style={{ backgroundColor: theme.colors.darkBg, overflow: 'hidden' }}>
        <DarkShapes t={t} seed={seed} />
      </AbsoluteFill>
    );
  }

  // 紙のテーマは 3D の場面でも紙の上に描く
  if (theme.pattern === 'paper') {
    return <PaperBackground />;
  }

  if (mode !== 'flat') {
    return <Background3D t={t} seed={seed} floor={mode === '3d'} toys={toys} />;
  }

  const spacing = theme.pattern === 'grid' ? 64 : 34;
  const patternImage =
    theme.pattern === 'grid'
      ? `linear-gradient(${theme.colors.pattern} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.pattern} 1px, transparent 1px)`
      : `radial-gradient(${theme.colors.pattern} 2px, transparent 2.5px)`;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          backgroundImage: patternImage,
          backgroundSize: `${spacing}px ${spacing}px`,
          backgroundPosition: `${(t * 0.25) % spacing}px ${(t * 0.15) % spacing}px`,
        }}
      />
      {/* ふわっと漂う大きな円 */}
      {[0, 1].map((i) => {
        const phase = seed * 1.7 + i * 2.4;
        const x = (i === 0 ? 1500 : 260) + Math.sin(t / 140 + phase) * 60;
        const y = (i === 0 ? 180 : 860) + Math.cos(t / 170 + phase) * 40;
        const size = i === 0 ? 560 : 420;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: theme.colors.blob,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** 紙の繊維のような細かいムラ (SVG のノイズ)。周辺をわずかに暗くして紙らしさを出す */
const PAPER_GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>' +
    '<feColorMatrix values="0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.55 0"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const PaperBackground: React.FC = () => {
  const theme = useTheme();
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ backgroundImage: PAPER_GRAIN, backgroundSize: '320px 320px', opacity: 0.35 }} />
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(80, 60, 30, 0.10) 100%)' }}
      />
    </AbsoluteFill>
  );
};

/** 濃い背景用: 回転するリングと漂う点 */
const DarkShapes: React.FC<{ t: number; seed: number }> = ({ t, seed }) => {
  const theme = useTheme();
  const rings = [
    { x: 1560, y: 230, r: 300, w: 2, speed: 0.08 },
    { x: 1560, y: 230, r: 210, w: 28, speed: -0.05 },
    { x: 300, y: 900, r: 240, w: 2, speed: 0.06 },
  ];
  const dots = Array.from({ length: 14 }, (_, i) => {
    const rx = ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1;
    const ry = ((Math.sin(i * 78.233 + seed) * 12345.6789) % 1 + 1) % 1;
    return {
      x: rx * 1920,
      y: ((ry * 1080 - t * (0.3 + rx * 0.5)) % 1140 + 1140) % 1140 - 30,
      r: 3 + rx * 5,
    };
  });

  return (
    <>
      {rings.map((ring, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: ring.x - ring.r,
            top: ring.y - ring.r,
            width: ring.r * 2,
            height: ring.r * 2,
            borderRadius: '50%',
            border: `${ring.w}px ${i === 0 ? 'dashed' : 'solid'} ${theme.colors.darkShape}`,
            transform: `rotate(${t * ring.speed * 6}deg)`,
          }}
        />
      ))}
      {dots.map((d, i) => (
        <div
          key={`d${i}`}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: '50%',
            backgroundColor: theme.colors.onDarkAccent,
            opacity: interpolate(Math.sin(t / 30 + i), [-1, 1], [0.1, 0.4]),
          }}
        />
      ))}
    </>
  );
};

/** 背景で回る積み木・ボールの置き場所 (中央のコンテンツ・見出し・右上のバッジを避けた画面のふち) */
const TOYS: Array<{ kind: 'cube' | 'ball'; x: number; y: number; size: number }> = [
  { kind: 'cube', x: 1480, y: 165, size: 110 },
  { kind: 'ball', x: 1840, y: 560, size: 74 },
  { kind: 'cube', x: 76, y: 690, size: 82 },
  { kind: 'ball', x: 1180, y: 74, size: 46 },
];

/** 立体の背景: 空のグラデーション + 奥へ続く床のグリッド + ふわふわ回る積み木とボール */
const Background3D: React.FC<{ t: number; seed: number; floor: boolean; toys: boolean }> = ({ t, seed, floor, toys }) => {
  const theme = useTheme();
  const grid = 120;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.colors.sky} 0%, ${theme.colors.bg} 58%, ${theme.colors.bg} 100%)`,
        overflow: 'hidden',
      }}
    >
      {floor ? (
        <AbsoluteFill style={{ perspective: 900, perspectiveOrigin: '50% 20%' }}>
          <div
            style={{
              position: 'absolute',
              left: -2400,
              right: -2400,
              top: '56%',
              height: 2600,
              transformOrigin: '50% 0%',
              transform: 'rotateX(80deg)',
              backgroundImage: `linear-gradient(${theme.colors.floorLine} 3px, transparent 3px), linear-gradient(90deg, ${theme.colors.floorLine} 3px, transparent 3px)`,
              backgroundSize: `${grid}px ${grid}px`,
              // 床がゆっくり手前に流れて、前に進んでいるように見える
              backgroundPosition: `${seed * 37}px ${(t * 1.4) % grid}px`,
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 22%)',
              maskImage: 'linear-gradient(180deg, transparent 0%, #000 22%)',
            }}
          />
        </AbsoluteFill>
      ) : null}
      {(toys ? TOYS : []).map((toy, i) => {
        const color = theme.toys[(i + seed) % theme.toys.length];
        const x = toy.x + Math.sin(t / 90 + i * 2.1 + seed) * 14;
        const y = toy.y + Math.cos(t / 70 + i * 1.3 + seed) * 18;
        return (
          <div key={i} style={{ position: 'absolute', left: x - toy.size / 2, top: y - toy.size / 2, perspective: 700 }}>
            {toy.kind === 'cube' ? (
              <CssCube size={toy.size} color={color} rx={-18 + Math.sin(t / 80 + i) * 10} ry={t * 0.6 + i * 40 + seed * 17} />
            ) : (
              <CssBall size={toy.size} color={color} />
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** CSS の 3D 変形で作る立方体。面ごとに明るさを変えて立体に見せる */
const CssCube: React.FC<{ size: number; color: string; rx: number; ry: number }> = ({ size, color, rx, ry }) => {
  const half = size / 2;
  const faces: Array<[string, number]> = [
    [`translateZ(${half}px)`, 0],
    [`rotateY(180deg) translateZ(${half}px)`, -0.12],
    [`rotateY(90deg) translateZ(${half}px)`, -0.18],
    [`rotateY(-90deg) translateZ(${half}px)`, 0.08],
    [`rotateX(90deg) translateZ(${half}px)`, 0.3],
    [`rotateX(-90deg) translateZ(${half}px)`, -0.3],
  ];
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
      }}
    >
      {faces.map(([transform, light], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: shade(color, light),
            border: `3px solid ${shade(color, -0.45)}`,
            borderRadius: size * 0.14,
            transform,
          }}
        />
      ))}
    </div>
  );
};

/** つやのあるボール (光沢の位置が固定の球) */
const CssBall: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 34% 30%, ${shade(color, 0.7)} 0%, ${shade(color, 0.15)} 22%, ${color} 55%, ${shade(color, -0.3)} 100%)`,
      border: `3px solid ${shade(color, -0.45)}`,
      boxShadow: `0 ${size * 0.35}px ${size * 0.25}px -${size * 0.2}px rgba(0, 0, 0, 0.18)`,
    }}
  />
);
