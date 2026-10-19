import React from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CountUp } from '../components/CountUp';
import { KineticText } from '../components/KineticText';
import { Reveal } from '../components/Reveal';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import type { Scene3DPresetContent } from '../schemas';
import { Lights, useOrbTextures } from './parts';
import { projectToScreen, withDrift, type Shot } from './camera';
import { PRESETS, type ObjectPreset, type Timing } from './presets';

type Content = Scene3DPresetContent;

/** 寄り・引きのバネ。ゆっくり滑らかに (約1.5秒) */
const DOLLY = { damping: 200, mass: 3, stiffness: 60 };
const KIND = { smooth: SPRINGS.smooth, snappy: SPRINGS.snappy, bouncy: SPRINGS.bouncy, dolly: DOLLY } as const;

/** カメラを毎フレーム決まった位置へ置く (R3F の useFrame ではなく Remotion のフレームで動かす) */
export const CameraRig: React.FC<{ shot: Shot }> = ({ shot }) => {
  const camera = useThree((state) => state.camera);
  camera.position.copy(shot.position);
  camera.lookAt(shot.target);
  camera.updateMatrixWorld();
  return null;
};

/** 画面上部中央の明朝の一文。**強調** は朱色 */
export const TitleOverlay: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  if (frame < at) {
    return null;
  }
  // 下地は文字と一緒にふわっと出す (文字より先に空の下地だけが見えないように)
  const opacity = interpolate(frame, [at, at + 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 110, display: 'flex', justifyContent: 'center', opacity }}>
      <KineticText
        text={text}
        at={at}
        stagger={1.1}
        rise={0.3}
        markerColor={theme.colors.highlight}
        markerInk={theme.colors.highlightInk}
        style={{
          fontFamily: theme.fonts.display,
          fontSize: 50,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: theme.colors.ink,
          textAlign: 'center',
          // 3D の物と重なっても読めるよう、紙色の下地を敷く
          backgroundColor: 'rgba(233, 225, 207, 0.88)',
          padding: '6px 28px 10px',
        }}
      />
    </div>
  );
};

/** 数字カード (3D の場面の上に重ねる) */
export const StatOverlay: React.FC<{
  stat: NonNullable<Content['stat']>;
  at: number;
  place: { align: 'left' | 'right'; x: number; y: number };
}> = ({ stat, at, place }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const style: React.CSSProperties =
    place.align === 'left' ? { position: 'absolute', left: place.x, top: place.y } : { position: 'absolute', right: 1920 - place.x, top: place.y };
  return (
    <Reveal id="stat" order={3} preset="pop" focusRing={false} style={style}>
      <div style={{ ...theme.card, padding: '18px 30px', minWidth: 300, textAlign: 'center' }}>
        {stat.kicker ? <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.textSecondary }}>{stat.kicker}</div> : null}
        <div style={{ fontFamily: theme.fonts.display, fontSize: 76, fontWeight: 600, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
          <CountUp value={stat.value} frame={frame} at={at} durationFrames={36} />
        </div>
        {stat.note ? <div style={{ fontSize: 15, color: theme.colors.textSecondary }}>{stat.note}</div> : null}
      </div>
    </Reveal>
  );
};

/**
 * 3D の物を引き出し線で指す注釈。線は物の画面上の位置から伸びるので、カメラや物が動いても追いかける。
 */
export const Callout: React.FC<{
  callout: Content['callouts'][number];
  anchor: { x: number; y: number };
  box: { x: number; y: number; align: 'left' | 'right' };
  at: number;
}> = ({ callout, anchor, box, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineP = springFrom(frame, at, fps, SPRINGS.smooth);
  const boxP = springFrom(frame, at + 6, fps, SPRINGS.snappy);
  if (frame < at) {
    return null;
  }
  const color =
    callout.tone === 'accent'
      ? theme.colors.accent
      : callout.tone === 'warning'
        ? theme.colors.warning
        : callout.tone === 'muted'
          ? '#8C857A'
          : theme.colors.ink;
  const attach = { x: box.x, y: box.y + 44 };
  return (
    <>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <line
          x1={anchor.x}
          y1={anchor.y}
          x2={anchor.x + (attach.x - anchor.x) * lineP}
          y2={anchor.y + (attach.y - anchor.y) * lineP}
          stroke={theme.colors.ink}
          strokeWidth={2}
        />
        <circle cx={anchor.x} cy={anchor.y} r={6 * Math.min(1, lineP * 3)} fill={theme.colors.ink} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: box.y,
          ...(box.align === 'left' ? { left: box.x } : { right: 1920 - box.x }),
          ...theme.card,
          borderColor: color,
          padding: '12px 22px 14px',
          opacity: interpolate(boxP, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${(1 - boxP) * 14}px)`,
        }}
      >
        <div style={{ fontFamily: theme.fonts.display, fontSize: 34, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{callout.title}</div>
        {callout.sub ? (
          <div style={{ fontSize: 18, color: theme.colors.textSecondary, marginTop: 2, whiteSpace: 'nowrap' }}>{callout.sub}</div>
        ) : null}
      </div>
    </>
  );
};

/**
 * 物を見せる 3D の場面 (自販機・熱など)。場面ごとの物と動きは presets.tsx に定義する。
 * 台本の reveal に書いた要素ID (machine / cold / heat / open / flow ...) の出現に合わせて物が動く。
 */
export const ObjectScene: React.FC<{ content: Content; preset: ObjectPreset }> = ({ content, preset }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ctx = useSceneContext();
  const spec = PRESETS[preset];
  const orbs = useOrbTextures();
  const local = frame - ctx.introAt;

  const startOf = (id: string): number | null => {
    if (ctx.isRevealed(id)) {
      return ctx.appearAt(id);
    }
    const autoIndex = spec.auto.indexOf(id);
    return autoIndex >= 0 ? ctx.introAt + 4 + autoIndex * 6 : null;
  };
  const timing: Timing = {
    p: (id, kind = 'smooth') => {
      const at = startOf(id);
      return at === null ? 0 : springFrom(frame, at, fps, KIND[kind]);
    },
    since: (id) => {
      const at = startOf(id);
      return at === null ? null : frame - at;
    },
    local,
  };

  const drift = interpolate(frame, [ctx.ts.startFrame, ctx.ts.startFrame + ctx.ts.durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cameraShot = withDrift(spec.shot(timing), drift, 0.1);
  const slots = spec.slots(timing);

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        flat
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: spec.fov, near: 0.1, far: 400, position: cameraShot.position.toArray() }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <CameraRig shot={cameraShot} />
        <Lights />
        {spec.render(timing, orbs)}
      </ThreeCanvas>

      {content.callouts.map((callout, i) => {
        const slot = slots[i];
        if (!slot) {
          return null;
        }
        // 注釈は reveal されたときに出す (reveal がなければシーン冒頭に順に出す)
        const at = ctx.appearAt(callout.id, 2 + i);
        return (
          <Callout key={callout.id} callout={callout} anchor={projectToScreen(slot.anchor, cameraShot, spec.fov)} box={slot.box} at={at} />
        );
      })}
      {content.title ? <TitleOverlay text={content.title} at={ctx.appearAt('title', 1)} /> : null}
      {content.stat ? <StatOverlay stat={content.stat} at={ctx.appearAt('stat', 3)} place={spec.stat ?? { align: 'right', x: 1850, y: 110 }} /> : null}
    </AbsoluteFill>
  );
};
