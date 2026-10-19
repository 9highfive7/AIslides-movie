import React from 'react';
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Reveal } from '../components/Reveal';
import { CountUp } from '../components/CountUp';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { PhoneChipModel } from '../three/PhoneChipModel';
import { CHIP_CENTER, FOV, LID_OPEN_DEG, cameraAt, projectToScreen } from '../three/phoneChip';
import { CameraRig, ObjectScene, TitleOverlay } from '../three/ObjectScene';
import type { Scene3DPresetContent } from '../schemas';
import { canvasFrame, useStage } from '../stage';

/** 寄りのバネ。ゆっくり滑らかに (約1.5秒) */
const DOLLY = { damping: 200, mass: 3, stiffness: 60 };

/** three.js で作り込んだ 3D の場面 (scene3d の preset)。phoneChip 以外 (自販機・熱など) は three/presets.tsx に定義 */
export const PresetScene3DLayout: React.FC<{ content: Scene3DPresetContent }> = ({ content }) =>
  content.preset === 'phoneChip' ? <PhoneChipScene content={content} /> : <ObjectScene content={content} preset={content.preset} />;

/**
 * phoneChip: スマホの箱が開き (reveal "open")、基板の上のチップへカメラが寄る (reveal "zoom")。
 * 注釈 (reveal "label") は引き出し線でチップを指し、数字カード (reveal "stat") は右上に出る。
 * stat が zoom より後に出るときは、さらにチップの表面まで寄る。
 */
const PhoneChipScene: React.FC<{ content: Scene3DPresetContent }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stage = useStage();
  const { width, height } = stage;
  const k = stage.textScale;
  const canvas = canvasFrame(stage, FOV);
  const ctx = useSceneContext();
  const { ts } = ctx;

  const openAt = ctx.appearAt('open', 0);
  const zoomAt = ctx.isRevealed('zoom') ? ctx.appearAt('zoom') : null;
  const statAt = ctx.appearAt('stat', 3);
  const closeAt = zoomAt !== null && ctx.isRevealed('stat') && statAt > zoomAt ? statAt : null;

  const lid = springFrom(frame, openAt, fps, { damping: 18, mass: 1.2, stiffness: 70 });
  const zoom = zoomAt === null ? 0 : springFrom(frame, zoomAt, fps, DOLLY);
  const close = closeAt === null ? 0 : springFrom(frame, closeAt, fps, DOLLY);
  const drift = interpolate(frame, [ts.startFrame, ts.startFrame + ts.durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const shot = cameraAt(zoom, close, drift);

  // 注釈: チップの画面上の位置から右上へ引き出し線を伸ばす。寄り始めたら消す
  const chipOnScreen = projectToScreen(CHIP_CENTER, shot);
  const labelAt = ctx.appearAt('label', 2);
  const lineP = springFrom(frame, labelAt, fps, SPRINGS.smooth);
  const labelFade = 1 - interpolate(zoom, [0, 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelBox = { x: chipOnScreen.x + 330, y: chipOnScreen.y - 190 };

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={canvas.width}
        height={canvas.height}
        flat
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: canvas.fov, near: 0.1, far: 200, position: shot.position.toArray() }}
        style={canvas.style ?? { position: 'absolute', inset: 0 }}
      >
        <CameraRig shot={shot} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[-6, 14, 8]} intensity={1.5} />
        <PhoneChipModel lidAngleRad={(LID_OPEN_DEG * Math.PI) / 180 * lid} />
      </ThreeCanvas>

      {content.label && ctx.isRevealed('label') && labelFade > 0 ? (
        <AbsoluteFill style={{ opacity: labelFade }}>
          <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
            <line
              x1={chipOnScreen.x}
              y1={chipOnScreen.y}
              x2={chipOnScreen.x + (labelBox.x - chipOnScreen.x) * lineP}
              y2={chipOnScreen.y + (labelBox.y + 60 - chipOnScreen.y) * lineP}
              stroke={theme.colors.ink}
              strokeWidth={2}
            />
            <circle cx={chipOnScreen.x} cy={chipOnScreen.y} r={6 * Math.min(1, lineP * 3)} fill={theme.colors.ink} />
          </svg>
          <Reveal id="label" order={2} preset="fadeUp" focusRing={false} style={{ position: 'absolute', left: labelBox.x, top: labelBox.y }}>
            <div style={{ ...theme.card, padding: '12px 22px', textAlign: 'center', ...(k === 1 ? null : { transform: `scale(${k})`, transformOrigin: '0 0' }) }}>
              <div style={{ fontFamily: theme.fonts.display, fontSize: 32, fontWeight: 700 }}>{content.label.title}</div>
              {content.label.sub ? (
                <div style={{ fontSize: 17, color: theme.colors.textSecondary, marginTop: 2 }}>{content.label.sub}</div>
              ) : null}
            </div>
          </Reveal>
        </AbsoluteFill>
      ) : null}

      {content.stat ? (
        <Reveal id="stat" order={3} preset="pop" focusRing={false} style={{ position: 'absolute', right: 70, top: 110 }}>
          <div
            style={{ ...theme.card, padding: '18px 30px', minWidth: 300, textAlign: 'center', ...(k === 1 ? null : { transform: `scale(${k})`, transformOrigin: '100% 0' }) }}
          >
            {content.stat.kicker ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.textSecondary }}>{content.stat.kicker}</div>
            ) : null}
            <div
              style={{
                fontFamily: theme.fonts.display,
                fontSize: 80,
                fontWeight: 600,
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <CountUp value={content.stat.value} frame={frame} at={statAt} durationFrames={36} />
            </div>
            {content.stat.note ? (
              <div style={{ fontSize: 15, color: theme.colors.textSecondary }}>{content.stat.note}</div>
            ) : null}
          </div>
        </Reveal>
      ) : null}
      {content.title ? <TitleOverlay text={content.title} at={ctx.appearAt('title', 1)} /> : null}
    </AbsoluteFill>
  );
};
