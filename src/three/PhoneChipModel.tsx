import React, { useMemo } from 'react';
import { BoxGeometry, CanvasTexture, CylinderGeometry, EdgesGeometry, SRGBColorSpace, type BufferGeometry } from 'three';
import { BOARD_TOP, BOX, CHIP } from './phoneChip';

/**
 * スマホの箱と、中の基板・チップの 3D モデル (three.js)。
 * 絵本のイラストのように、ベタ塗りの面 + 黒い輪郭線で描く。
 */

const COLORS = {
  box: '#3F5F86',
  boxInner: '#36557A',
  board: '#6F8CB0',
  panel: '#D9CCAF',
  part: '#B9C4CF',
  chip: '#2A231C',
  outline: '#1C1F26',
} as const;

/** 面 + 輪郭線。geometry は呼び出し側で useMemo しておく */
const Outlined: React.FC<{
  geometry: BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  map?: CanvasTexture;
}> = ({ geometry, color, position, rotation, map }) => {
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        <meshLambertMaterial color={map ? '#FFFFFF' : color} map={map ?? null} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={COLORS.outline} />
      </lineSegments>
    </group>
  );
};

/** チップ表面の模様 (金色の細い配線と区画)。Canvas に描いてテクスチャにする */
const useChipTexture = (): CanvasTexture => {
  return useMemo(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d') as CanvasRenderingContext2D;
    g.fillStyle = '#2E251B';
    g.fillRect(0, 0, size, size);

    // 縁取り
    g.strokeStyle = '#8A6A33';
    g.lineWidth = 10;
    g.strokeRect(40, 40, size - 80, size - 80);

    // 細かい縦縞 (回路の線)
    g.strokeStyle = 'rgba(176, 138, 62, 0.55)';
    g.lineWidth = 2;
    for (let x = 60; x < size - 60; x += 7) {
      g.beginPath();
      g.moveTo(x, 60);
      g.lineTo(x, size - 60);
      g.stroke();
    }

    // 区画 (CPU やメモリのブロック)
    const blocks: [number, number, number, number][] = [
      [80, 80, 300, 200],
      [400, 80, 200, 200],
      [620, 80, 320, 120],
      [620, 220, 150, 140],
      [790, 220, 150, 140],
      [80, 300, 300, 280],
      [400, 300, 200, 120],
    ];
    for (const [x, y, w, h] of blocks) {
      g.fillStyle = 'rgba(60, 48, 34, 0.95)';
      g.fillRect(x, y, w, h);
      g.strokeStyle = '#B08A3E';
      g.lineWidth = 4;
      g.strokeRect(x, y, w, h);
      g.strokeStyle = 'rgba(176, 138, 62, 0.45)';
      g.lineWidth = 1.5;
      for (let yy = y + 10; yy < y + h; yy += 9) {
        g.beginPath();
        g.moveTo(x + 6, yy);
        g.lineTo(x + w - 6, yy);
        g.stroke();
      }
    }
    // 小さな「明るい区画」(画像処理などのブロック)
    g.fillStyle = 'rgba(120, 130, 150, 0.55)';
    g.fillRect(430, 120, 60, 50);
    g.fillRect(510, 120, 60, 50);
    g.fillRect(660, 110, 70, 50);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
};

export const PhoneChipModel: React.FC<{ lidAngleRad: number }> = ({ lidAngleRad }) => {
  const { width: W, depth: D, wall: T, height: H } = BOX;
  const chipTexture = useChipTexture();

  const geo = useMemo(
    () => ({
      floor: new BoxGeometry(W, 0.3, D),
      wallLong: new BoxGeometry(T, H, D),
      wallShort: new BoxGeometry(W - 2 * T, H, T),
      lid: new BoxGeometry(W + 0.4, 0.3, D + 0.4),
      board: new BoxGeometry(W - 1.4, 0.25, 5.2),
      panel: new BoxGeometry(W - 1.4, 0.2, 7.0),
      chip: new BoxGeometry(CHIP.size, CHIP.height, CHIP.size),
      capBig: new CylinderGeometry(0.5, 0.5, 0.28, 32),
      capSmall: new CylinderGeometry(0.36, 0.36, 0.24, 32),
      part: new BoxGeometry(0.5, 0.18, 0.34),
    }),
    [W, D, T, H],
  );

  return (
    <group>
      {/* 箱の本体 */}
      <Outlined geometry={geo.floor} color={COLORS.boxInner} position={[0, 0.15, 0]} />
      <Outlined geometry={geo.wallLong} color={COLORS.box} position={[-(W - T) / 2, H / 2, 0]} />
      <Outlined geometry={geo.wallLong} color={COLORS.box} position={[(W - T) / 2, H / 2, 0]} />
      <Outlined geometry={geo.wallShort} color={COLORS.box} position={[0, H / 2, -(D - T) / 2]} />
      <Outlined geometry={geo.wallShort} color={COLORS.box} position={[0, H / 2, (D - T) / 2]} />

      {/* 蓋: 奥の上端を軸に開く */}
      <group position={[0, H + 0.02, -(D + 0.4) / 2]} rotation={[lidAngleRad, 0, 0]}>
        <Outlined geometry={geo.lid} color={COLORS.box} position={[0, 0.15, (D + 0.4) / 2]} />
      </group>

      {/* 中身: 奥に基板、手前にスマホの板 */}
      <Outlined geometry={geo.board} color={COLORS.board} position={[0, 0.3 + 0.125, -3.6]} />
      <Outlined geometry={geo.panel} color={COLORS.panel} position={[0, 0.3 + 0.1, 2.7]} />

      {/* 基板の上の部品 */}
      <Outlined geometry={geo.capBig} color={COLORS.part} position={[-1.7, BOARD_TOP + 0.14, -5.0]} />
      <Outlined geometry={geo.capSmall} color={COLORS.part} position={[-0.5, BOARD_TOP + 0.12, -5.3]} />
      <Outlined geometry={geo.capSmall} color={COLORS.part} position={[-2.2, BOARD_TOP + 0.12, -3.6]} />
      <Outlined geometry={geo.part} color={COLORS.part} position={[-0.9, BOARD_TOP + 0.09, -2.3]} />
      <Outlined geometry={geo.part} color={COLORS.part} position={[-2.1, BOARD_TOP + 0.09, -2.2]} />
      <Outlined geometry={geo.part} color={COLORS.part} position={[2.4, BOARD_TOP + 0.09, -5.6]} />

      {/* チップ: 上面にだけ模様のテクスチャを貼る */}
      <Outlined geometry={geo.chip} color={COLORS.chip} position={[CHIP.x, BOARD_TOP + CHIP.height / 2, CHIP.z]} />
      <mesh position={[CHIP.x, BOARD_TOP + CHIP.height + 0.002, CHIP.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CHIP.size * 0.94, CHIP.size * 0.94]} />
        <meshLambertMaterial map={chipTexture} />
      </mesh>
    </group>
  );
};
