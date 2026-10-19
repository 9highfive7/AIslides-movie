import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { FONT_FAMILY, THEMES } from './themes';
import { ensureFonts } from './fonts';
import { SHAPES, SHAPE_NAMES } from './three/catalog';
import { ShapeModel } from './three/models';
import { ToyLights } from './three/toon';

const W = 1920;
const H = 1080;
const COLS = 8;
const CELL_W = W / COLS;
const CELL_H = 155;
const TOP = 150;
/** 1ワールド単位あたりのピクセル数 (正射影カメラの zoom) */
const PX = 100;

/** マス目の中心 (画面座標) */
const cellCenter = (i: number) => ({ x: CELL_W / 2 + (i % COLS) * CELL_W, y: TOP + Math.floor(i / COLS) * CELL_H });

/**
 * scene3d の shape に書ける 3D オブジェクトの一覧 (Remotion Studio で台本を書くときの見本)。
 * npx remotion still ShapeCatalog out/shapes.png で画像にもできる。
 */
export const ShapeCatalog: React.FC = () => {
  ensureFonts();
  const theme = THEMES.kids;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: FONT_FAMILY, color: theme.colors.ink }}>
      <div style={{ position: 'absolute', left: 48, top: 26, fontSize: 34, fontWeight: 900 }}>
        3D オブジェクト図鑑
        <span style={{ marginLeft: 20, fontSize: 20, fontWeight: 700, color: theme.colors.textSecondary }}>
          scene3d の objects[].shape に書けるキー（{SHAPE_NAMES.length}種）
        </span>
      </div>
      <ThreeCanvas width={W} height={H} flat orthographic gl={{ antialias: true }} camera={{ position: [0, 0, 20], zoom: PX }}>
        <ToyLights />
        {SHAPE_NAMES.map((name, i) => {
          const c = cellCenter(i);
          // 形の底をマス目の中心より少し下に置き、斜めから見せて立体だとわかるようにする
          return (
            <group key={name} position={[(c.x - W / 2) / PX, (H / 2 - (c.y + 34)) / PX, 0]} rotation={[0.25, -0.45, 0]} scale={0.5}>
              <ShapeModel shape={name} />
            </group>
          );
        })}
      </ThreeCanvas>
      {SHAPE_NAMES.map((name, i) => {
        const c = cellCenter(i);
        return (
          <div
            key={name}
            style={{ position: 'absolute', left: c.x - CELL_W / 2, width: CELL_W, top: c.y + 46, textAlign: 'center', lineHeight: 1.25 }}
          >
            <div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'monospace' }}>{name}</div>
            <div style={{ fontSize: 14, color: theme.colors.textSecondary }}>{SHAPES[name].ja}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
