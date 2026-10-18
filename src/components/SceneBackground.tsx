import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { useTheme } from '../themes';

/**
 * シーンの背景。各シーンが自前で不透明な背景を持つので、
 * スライド系のトランジションでも背景ごと入れ替わる。
 * animated のときは模様と図形がゆっくり漂う (YouTube 向けの「止まって見えない」画面)。
 */
export const SceneBackground: React.FC<{ variant: 'light' | 'dark'; animated: boolean; seed: number }> = ({
  variant,
  animated,
  seed,
}) => {
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

  if (theme.pattern === 'paper') {
    return <PaperBackground />;
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
