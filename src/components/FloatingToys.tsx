import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { SPRINGS, springFrom } from '../animation/presets';
import { DEFAULT_FLOATING } from '../three/catalog';
import { ShapeModel } from '../three/models';
import { ToyLights } from '../three/toon';
import { VIDEO_H, VIDEO_W } from '../three/stage';

type Spot = [number, number];

/**
 * 置き場所 (ワールド座標 x, y。画面の中心が 0,0、1 ≒ 144px)。
 * 文字の置かれる中央・字幕・右下のキャラクターを避けた、画面のふち沿い。
 */
const SPOTS: Record<'title' | 'section' | 'outro', Spot[]> = {
  title: [
    [-5.3, 1.6],
    [5.3, 1.8],
    [-5.6, -1.6],
    [5.5, -0.9],
    [-3.2, 3.0],
    [3.4, 3.1],
  ],
  section: [
    [-5.3, 1.8],
    [5.3, 1.6],
    [-5.5, -1.5],
    [5.5, -0.9],
  ],
  outro: [
    [-5.4, 2.4],
    [5.4, 2.5],
    [-5.7, -0.6],
    [5.7, -0.4],
  ],
};

/**
 * タイトル・章扉・エンディングのまわりに浮かぶ 3D オブジェクト (style: "3d")。
 * ポンと飛び出して回転しながら現れ、その後はふわふわ漂い続ける。
 */
export const FloatingToys: React.FC<{
  kind: 'title' | 'section' | 'outro';
  shapes?: string[];
  at: number;
}> = ({ kind, shapes, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spots = SPOTS[kind];
  const list = useMemo(() => {
    const chosen = shapes && shapes.length > 0 ? shapes : DEFAULT_FLOATING[kind];
    return chosen.slice(0, spots.length);
  }, [shapes, kind, spots.length]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <ThreeCanvas width={VIDEO_W} height={VIDEO_H} flat gl={{ antialias: true }} camera={{ fov: 30, position: [0, 0, 14] }}>
        <ToyLights />
        {list.map((shape, i) => {
          const start = at + 6 + i * 5;
          if (frame < start) {
            return null;
          }
          const [x, y] = spots[i];
          const p = springFrom(frame, start, fps, SPRINGS.bouncy);
          const t = frame - start;
          const dir = i % 2 === 0 ? 1 : -1;
          return (
            <group
              key={`${shape}-${i}`}
              position={[x, y + Math.sin(t / 28 + i * 1.7) * 0.16, 0]}
              rotation={[
                Math.sin(t / 45 + i) * 0.22,
                // 正面 (顔のある側) がおおむねこちらを向いたまま、左右にゆらゆら回る
                (1 - Math.min(p, 1)) * Math.PI * 2 + dir * Math.sin(t / 50 + i) * 0.55,
                Math.sin(t / 60 + i) * 0.12,
              ]}
              scale={0.85 * Math.max(0, p)}
            >
              {/* 形は床置き (y=0 が底) なので、回転の中心を形の真ん中に合わせる */}
              <group position={[0, -0.8, 0]}>
                <ShapeModel shape={shape} />
              </group>
            </group>
          );
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
