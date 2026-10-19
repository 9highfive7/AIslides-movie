import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { useTheme } from '../themes';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { scene3dArrowIds } from '../elements';
import { resolveColor } from '../three/catalog';
import { ShapeModel } from '../three/models';
import { G, Part, ToneContext } from '../three/toon';
import {
  cameraPose,
  cycleArrows,
  layoutStage,
  projectToScreen,
  VIDEO_H,
  VIDEO_W,
  type CameraPose,
  type PlacedGroup,
  type V3,
} from '../three/stage';
import { isBuildScene3D, isPresetScene3D, type Scene3DObjectsContent } from '../schemas';
import { canvasFrame, useStage } from '../stage';
import { BuildScene } from '../three/BuildScene';
import type { ContentOf } from './common';
import { PresetScene3DLayout } from './PresetScene3DLayout';

type Content = Scene3DObjectsContent;

/** 同じ物を count 個出すときの、1個ずつの時間差 [フレーム] (「いち、に、さん」と数えられる間) */
const COUNT_STAGGER_FRAMES = 5;

/** 毎フレーム、カメラを計算どおりの位置に置く */
const CameraRig: React.FC<{ pose: CameraPose }> = ({ pose }) => {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = pose.fov;
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  });
  return null;
};

/** やわらかい環境光 + 影を落とす太陽光 */
const StageLights: React.FC = () => (
  <>
    <ambientLight intensity={1.0} />
    <hemisphereLight args={['#FFFFFF', '#B9C6D8', 0.35]} />
    <directionalLight
      position={[5, 11, 8]}
      intensity={1.5}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-left={-11}
      shadow-camera-right={11}
      shadow-camera-top={11}
      shadow-camera-bottom={-11}
      shadow-bias={-0.0008}
    />
  </>
);

/** 物を乗せる丸い舞台 (上面が y=0) */
const Floor: React.FC<{ color: string; edge: string }> = ({ color, edge }) => (
  <group>
    <mesh position={[0, -0.2, -0.6]} receiveShadow>
      <cylinderGeometry args={[8.6, 8.6, 0.4, 96]} />
      <meshToonMaterial color={color} />
    </mesh>
    <mesh position={[0, -0.42, -0.6]}>
      <cylinderGeometry args={[8.75, 8.75, 0.3, 96]} />
      <meshToonMaterial color={edge} />
    </mesh>
  </group>
);

/** 1種類の物 (count 個) */
const ObjectGroup: React.FC<{
  group: PlacedGroup;
  shape: string;
  color?: string;
  at: number;
  index: number;
  focus: number;
  dim: number;
  stepColor: string;
}> = ({ group, shape, color, at, index, focus, dim, stepColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tone = useMemo(() => ({ dim, glow: focus }), [dim, focus]);

  const stepsP = springFrom(frame, at - 4, fps, SPRINGS.snappy);

  return (
    <ToneContext.Provider value={tone}>
      {frame >= at - 4
        ? group.steps.map((step, k) => (
            <Part
              key={`step-${k}`}
              geo={G.rbox(1, 1, 1, 0.04)}
              color={stepColor}
              position={[group.x, (step.h * group.scale * stepsP) / 2, group.z + step.z * group.scale]}
              scale={[group.width * 0.98, Math.max(0.001, step.h * group.scale * stepsP), step.d * group.scale]}
            />
          ))
        : null}
      {group.copies.map((copy, j) => {
        const copyAt = at + j * COUNT_STAGGER_FRAMES;
        if (frame < copyAt) {
          return null;
        }
        const p = springFrom(frame, copyAt, fps, SPRINGS.bouncy);
        // 上から落ちてきて床で弾む (バネの行き過ぎ = 着地のつぶれ、戻り = 小さく跳ねる)
        const fall = Math.max(0, 1 - p) * 3.4;
        const squash = Math.min(0.22, Math.max(0, p - 1) * 1.4);
        const grow = interpolate(p, [0, 0.35], [0.25, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const settled = interpolate(frame - copyAt, [10, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const spin = (1 - Math.min(p, 1)) * Math.PI * 1.4;
        const sway = Math.sin((frame - copyAt) / 38 + index * 1.3 + j) * 0.32 * settled;
        const bob = Math.sin((frame - copyAt) / 17 + index + j * 0.7) * 0.05 * settled;
        const hop = Math.abs(Math.sin(frame / 6.5)) * 0.32 * focus;
        const s = group.scale * copy.scale * grow * (1 + 0.16 * focus);

        return (
          <group
            key={j}
            position={[group.x + copy.x * group.scale, copy.y * group.scale + fall + bob + hop, group.z + copy.z * group.scale]}
            rotation={[0, spin + sway, 0]}
            scale={[s * (1 + squash / 2), s * (1 - squash), s * (1 + squash / 2)]}
          >
            <ShapeModel shape={shape} color={color} />
          </group>
        );
      })}
    </ToneContext.Provider>
  );
};

/** 説明中の物の足もとで光る輪 */
const FocusRing: React.FC<{ group: PlacedGroup; focus: number; color: string }> = ({ group, focus, color }) => {
  const frame = useCurrentFrame();
  if (focus <= 0.01) {
    return null;
  }
  const r = Math.max(group.width, group.depth) * 0.55;
  const pulse = 1 + Math.sin(frame / 5) * 0.04;
  return (
    <mesh position={[group.x, 0.03, group.z]} rotation={[-Math.PI / 2, 0, 0]} scale={pulse}>
      <ringGeometry args={[r * 0.82, r, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.85 * focus} />
    </mesh>
  );
};

/** まっすぐな 3D 矢印 (flow)。線が伸びてから先端が出て、玉が流れ続ける */
const StraightArrow: React.FC<{ from: V3; to: V3; at: number; color: string }> = ({ from, to, at, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) {
    return null;
  }
  const p = springFrom(frame, at, fps, SPRINGS.smooth);
  const len = to[0] - from[0];
  const head = 0.42;
  const shaft = Math.max(0.01, (len - head) * p);
  const headScale = interpolate(p, [0.6, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const flowT = ((frame - at) % 36) / 36;
  const flowOn = p > 0.98;
  return (
    <group position={from}>
      <Part geo={G.cylinder(0.09, 0.09, 1, 24)} color={color} position={[shaft / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, shaft, 1]} />
      <Part
        geo={G.cone(0.24, head, 32)}
        color={color}
        position={[shaft + head / 2, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={headScale}
      />
      {flowOn ? (
        <Part
          geo={G.sphere(0.15)}
          color="#FFE066"
          position={[flowT * (len - head), 0, 0]}
          scale={Math.sin(flowT * Math.PI)}
          emissive={0.6}
          outline={false}
        />
      ) : null}
    </group>
  );
};

/** 輪 (楕円) に沿って曲がる 3D 矢印 (cycle)。線が伸びてから先端が出る */
const ArcArrow: React.FC<{
  ellipse: { rx: number; rz: number; cz: number };
  a0: number;
  a1: number;
  at: number;
  color: string;
  /** 形のキャッシュのキー (シーンごとに別の形にする。線の伸び具合を形ごとに持つため) */
  id: string;
}> = ({ ellipse, a0, a1, at, color, id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pointAt = useMemo(
    () => (a: number) => new THREE.Vector3(Math.cos(a) * ellipse.rx, 0.22, ellipse.cz + Math.sin(a) * ellipse.rz),
    [ellipse],
  );
  const geo = useMemo(
    () =>
      G.tube(
        `arc:${id}:${a0.toFixed(3)}:${a1.toFixed(3)}:${ellipse.rx}:${ellipse.rz}`,
        () => new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, i) => pointAt(a0 + ((a1 - a0) * i) / 15))),
        0.1,
      ),
    [id, a0, a1, ellipse, pointAt],
  );
  if (frame < at) {
    return null;
  }
  const p = springFrom(frame, at, fps, SPRINGS.smooth);
  const indexCount = geo.index ? geo.index.count : 0;
  // 線が伸びる: 描く三角形の数を進み具合で増やす (6 の倍数 = 管の1区切り)
  geo.setDrawRange(0, Math.floor((indexCount * Math.min(1, p)) / 6) * 6);

  const end = pointAt(a1);
  const tangent = pointAt(a1).sub(pointAt(a1 - 0.02)).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  const e = new THREE.Euler().setFromQuaternion(q);
  const headScale = interpolate(p, [0.85, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <group>
      <Part geo={geo} color={color} />
      <Part geo={G.cone(0.26, 0.5, 32)} color={color} position={end.toArray() as V3} rotation={[e.x, e.y, e.z]} scale={headScale} />
    </group>
  );
};

/** 物の下 (奥の物は上) に出る名札 */
const Label: React.FC<{ text: string; x: number; y: number; above: boolean; at: number; focus: number; dim: number }> = ({
  text,
  x,
  y,
  above,
  at,
  focus,
  dim,
}) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springFrom(frame, at, fps, SPRINGS.bouncy);
  const k = useStage().textScale;
  if (frame < at) {
    return null;
  }
  const accent = focus > 0.5;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, ${above ? '-100%' : '0'}) scale(${(0.4 + 0.6 * Math.min(p, 1.2)) * (1 + 0.12 * focus) * k})`,
        transformOrigin: above ? '50% 100%' : '50% 0%',
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }) * (1 - 0.55 * dim),
        padding: '8px 26px',
        borderRadius: 999,
        backgroundColor: accent ? theme.colors.accent : theme.colors.surface,
        color: accent ? theme.colors.onAccent : theme.colors.ink,
        border: `4px solid ${accent ? theme.colors.accent : theme.colors.ink}`,
        boxShadow: `0 6px 0 ${theme.colors.edge}`,
        fontSize: 32,
        fontWeight: 900,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </div>
  );
};

/** scene3d: preset があれば作り込んだ場面、parts があれば部品を組み立てた場面、なければ objects を舞台に並べる */
export const Scene3DLayout: React.FC<{ content: ContentOf<'scene3d'> }> = ({ content }) =>
  isPresetScene3D(content) ? (
    <PresetScene3DLayout content={content} />
  ) : isBuildScene3D(content) ? (
    <BuildScene content={content} />
  ) : (
    <ObjectsScene3DLayout content={content} />
  );

/**
 * 3D オブジェクトで見せるレイアウト。台本の objects (形・色・数・大きさ) を舞台に並べ、
 * 上から落ちてきて弾むように登場させる。flow は矢印でつなぎ、cycle は輪にして一周させる。
 * focus 中の物はぴょんぴょん跳ねて足もとが光り、他の物は淡くなる。
 */
const ObjectsScene3DLayout: React.FC<{ content: Content }> = ({ content }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const ctx = useSceneContext();
  const start = ctx.ts.startFrame;
  const end = start + ctx.ts.durationFrames;
  const { objects, arrangement } = content;

  const stage = useMemo(() => layoutStage(objects, arrangement), [objects, arrangement]);
  const pose = cameraPose(arrangement, frame, start, end);
  // 縦の動画の帯の中では、3D を上下に描き足す (画角だけ広げる。名札の位置は 16:9 の pose のまま計算する)
  const canvas = canvasFrame(useStage(), pose.fov);
  const arrowIds = scene3dArrowIds(content);

  const objectAt = objects.map((obj, i) => ctx.appearAt(obj.id, i * 3));
  const arrowAt = arrowIds.map((id, i) => ctx.appearAt(id, i * 3 + 2));
  const focus = objects.map((obj) => ctx.focusOf(obj.id, frame));
  const accent = theme.colors.accent;

  const n = objects.length;
  const cycle = useMemo(() => cycleArrows(stage), [stage]);

  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={canvas.style ? canvas.width : VIDEO_W}
        height={canvas.style ? canvas.height : VIDEO_H}
        shadows
        flat
        gl={{ antialias: true }}
        camera={{ fov: canvas.fov, position: pose.position, near: 0.1, far: 200 }}
        style={canvas.style}
      >
        <CameraRig pose={canvas.style ? { ...pose, fov: canvas.fov } : pose} />
        <StageLights />
        <Floor color={theme.colors.stage} edge={theme.colors.stageEdge} />
        {stage.groups.map((group, i) => (
          <FocusRing key={`ring-${objects[i].id}`} group={group} focus={focus[i].focus} color={accent} />
        ))}
        {stage.groups.map((group, i) => (
          <ObjectGroup
            key={objects[i].id}
            group={group}
            shape={objects[i].shape}
            color={resolveColor(objects[i].color)}
            at={objectAt[i]}
            index={i}
            focus={focus[i].focus}
            dim={focus[i].dim}
            stepColor={theme.colors.surface}
          />
        ))}
        {arrangement === 'flow'
          ? arrowIds.map((id, i) => {
              const a = stage.groups[i];
              const b = stage.groups[i + 1];
              const y = 0.75 * Math.min(a.scale, b.scale);
              return (
                <StraightArrow
                  key={id}
                  from={[a.x + a.width / 2 + 0.05, y, 0]}
                  to={[b.x - b.width / 2 - 0.05, y, 0]}
                  at={arrowAt[i]}
                  color={accent}
                />
              );
            })
          : null}
        {cycle
          ? arrowIds.map((id, i) => (
              <ArcArrow
                key={id}
                id={`${ctx.scene.id}:${id}`}
                ellipse={cycle.ring}
                a0={cycle.arcs[i].a0}
                a1={cycle.arcs[i].a1}
                at={arrowAt[i]}
                color={accent}
              />
            ))
          : null}
      </ThreeCanvas>
      {objects.map((obj, i) => {
        if (!obj.label) {
          return null;
        }
        const group = stage.groups[i];
        // 輪 (cycle) では、いちばん手前の物以外は名札を上に出す (手前の物や矢印と重ならないように)
        const above = stage.ellipse !== null && group.z < stage.ellipse.cz + stage.ellipse.rz * 0.6;
        const anchor = above
          ? projectToScreen(pose, [group.x, 1.75 * group.scale + 0.15, group.z])
          : projectToScreen(pose, [group.x, 0, group.z + group.depth / 2]);
        return (
          <Label
            key={obj.id}
            text={obj.label}
            x={anchor.x}
            y={anchor.y + (above ? -6 : 14)}
            above={above}
            at={objectAt[i] + 10 + (obj.count - 1) * COUNT_STAGGER_FRAMES}
            focus={focus[i].focus}
            dim={focus[i].dim}
          />
        );
      })}
      {content.caption ? <Caption text={content.caption} at={ctx.appearAt('caption', n * 3 + 2)} /> : null}
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const p = springFrom(frame, at, fps, SPRINGS.snappy);
  const { focus, dim } = ctx.focusOf('caption', frame);
  const k = useStage().textScale;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 214,
        display: 'flex',
        justifyContent: 'center',
        opacity: interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }) * (1 - 0.55 * dim),
        transform: `translateY(${(1 - p) * 30}px) scale(${(1 + 0.05 * focus) * k})`,
        transformOrigin: k === 1 ? undefined : '50% 100%',
      }}
    >
      <div
        style={{
          padding: '10px 30px',
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          border: `3px solid ${focus > 0.5 ? theme.colors.accent : theme.colors.line}`,
          boxShadow: `0 6px 0 ${theme.colors.edge}`,
          fontSize: 28,
          fontWeight: 700,
          color: theme.colors.ink,
        }}
      >
        {text}
      </div>
    </div>
  );
};
