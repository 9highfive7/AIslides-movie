import React from 'react';
import { Vector3 } from 'three';
import { Billboard, useOrbTextures } from './parts';
import { Bolt, CalendarTile, Fridge, House, PIPE_LOOP, VendingMachine } from './objects';
import { lerpShot, shot, type Shot } from './camera';

/**
 * 3D の場面の中身 (vending* / heatReuse)。
 * 物の動きはすべて「台本の reveal で決まる進み具合 (0→1)」と「シーン内の経過フレーム」から計算する。
 */

export interface Timing {
  /** 要素の進み具合 (バネ 0→1)。reveal されず auto でもなければ 0 */
  p: (id: string, kind?: 'smooth' | 'snappy' | 'bouncy' | 'dolly') => number;
  /** 要素の出現フレームからの経過 (出現前は負。出ない要素は null) */
  since: (id: string) => number | null;
  /** シーン開始からの経過フレーム */
  local: number;
}

export interface CalloutSlot {
  /** 指す 3D の点 */
  anchor: Vector3;
  /** 注釈ボックスの位置 [px]。align left: x がボックスの左端 / right: x がボックスの右端 */
  box: { x: number; y: number; align: 'left' | 'right' };
}

type Orbs = ReturnType<typeof useOrbTextures>;

export interface PresetSpec {
  fov: number;
  /** reveal されていなくてもシーン冒頭に自動で出る要素 */
  auto: string[];
  shot: (t: Timing) => Shot;
  render: (t: Timing, orbs: Orbs) => React.ReactNode;
  slots: (t: Timing) => CalloutSlot[];
  stat?: { align: 'left' | 'right'; x: number; y: number };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t);
/** 物の向き (y軸回転) を考えた、物のローカル座標 → ワールド座標 */
const toWorld = (local: [number, number, number], origin: [number, number, number], rotY: number) =>
  new Vector3(...local).applyAxisAngle(new Vector3(0, 1, 0), rotY).add(new Vector3(...origin));

/* ---------- 1. 台数: 1台 → ずらっと並ぶ ---------- */

const CROWD = (() => {
  const list: { x: number; z: number; order: number }[] = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 9; c++) {
      list.push({ x: -10.4 + c * 2.6 + (r % 2) * 1.3, z: -4.5 - r * 3.2, order: r * 3 + Math.abs(c - 4) });
    }
  }
  return list;
})();

const vendingCount: PresetSpec = {
  fov: 30,
  auto: ['machine'],
  shot: (t) => lerpShot(shot([3.2, 2.3, 9.6], [0, 1.75, 0]), shot([-3, 10.5, 14], [2.5, 0.6, -7]), t.p('many', 'dolly')),
  render: (t) => {
    const since = t.since('many');
    return (
      <>
        <VendingMachine rotationY={-0.35} hotRow={2} scale={Math.max(0.001, t.p('machine', 'bouncy'))} />
        {since === null
          ? null
          : CROWD.map((m) => {
              const s = clamp01((since - 10 - m.order * 1.1) / 8);
              return s <= 0 ? null : (
                <VendingMachine key={`${m.x}-${m.z}`} position={[m.x, 0, m.z]} rotationY={-0.35} hotRow={2} scale={s} />
              );
            })}
      </>
    );
  },
  slots: () => [],
  stat: { align: 'right', x: 1850, y: 110 },
};

/* ---------- 2. 冷たいと温かい: 自販機の左右に玉が飛んでくる ---------- */

const COLD_FROM = new Vector3(-7, 4.5, 1);
const COLD_TO = new Vector3(-2.3, 2.6, 0.6);
const HEAT_FROM = new Vector3(7, 0.4, 1);
const HEAT_TO = new Vector3(2.3, 1.6, 0.6);

const hotColdOrbs = (t: Timing) => {
  const bob = (phase: number) => new Vector3(0, Math.sin(t.local / 18 + phase) * 0.08, 0);
  return {
    cold: v3(COLD_FROM, COLD_TO, t.p('cold', 'snappy')).add(bob(0)),
    heat: v3(HEAT_FROM, HEAT_TO, t.p('heat', 'snappy')).add(bob(1.7)),
  };
};

const vendingHotCold: PresetSpec = {
  fov: 30,
  auto: ['machine'],
  shot: () => shot([0.8, 2.3, 9.8], [0, 1.7, 0]),
  render: (t, orbs) => {
    const pos = hotColdOrbs(t);
    return (
      <>
        <VendingMachine rotationY={-0.25 + Math.sin(t.local / 90) * 0.08} hotRow={2} />
        <Billboard map={orbs.cold} position={pos.cold.toArray()} size={1.5} opacity={t.p('cold') > 0.01 ? 1 : 0} />
        <Billboard map={orbs.heat} position={pos.heat.toArray()} size={1.7} opacity={t.p('heat') > 0.01 ? 1 : 0} />
      </>
    );
  },
  slots: (t) => {
    const pos = hotColdOrbs(t);
    return [
      { anchor: pos.cold.clone().add(new Vector3(0, -0.45, 0)), box: { x: 170, y: 600, align: 'left' } },
      { anchor: pos.heat.clone().add(new Vector3(0, -0.45, 0)), box: { x: 1750, y: 700, align: 'right' } },
    ];
  },
};

/* ---------- 3. 透視図: 扉が開き、管の中を熱が運ばれる ---------- */

/** 管の上の位置 u [0..1] での熱の玉の大きさ。冷たい室で熱を吸って育ち、圧縮で最大、温かい室で熱を渡して縮む */
const orbSize = (u: number) => {
  const [h0, h1] = PIPE_LOOP.hotCoil;
  const [c0, c1] = PIPE_LOOP.coldCoil;
  if (u < h0) return 0.34;
  if (u < h1) return lerp(0.34, 0.15, (u - h0) / (h1 - h0));
  if (u < c0) return 0.15;
  if (u < c1) return lerp(0.15, 0.26, (u - c0) / (c1 - c0));
  return lerp(0.26, 0.34, (u - c1) / (1 - c1));
};

const CUT_ROT = -0.12;

/** 管を流れる熱の玉と、室の中を漂う小さな熱 (自販機のローカル座標で描く) */
const HeatFlow: React.FC<{ t: Timing; orbs: Orbs; amount: number }> = ({ t, orbs, amount }) => {
  if (amount <= 0) return null;
  const N = 11;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const u = (((i / N + t.local * 0.0032) % 1) + 1) % 1;
    const p = PIPE_LOOP.path.getPointAt(u);
    const size = orbSize(u);
    items.push(
      <Billboard key={`f${i}`} map={size > 0.25 ? orbs.heat : orbs.heatPlain} position={[p.x, p.y, p.z + 0.06]} size={size} opacity={amount} />,
    );
  }
  // 冷たい室: 缶 → 管 (吸熱) / 温かい室: 管 → 缶 (放熱)
  for (let k = 0; k < 3; k++) {
    const phase = (((t.local + k * 17) % 50) + 50) % 50 / 50;
    const fade = Math.sin(phase * Math.PI) * amount;
    const y = 1.55 + k * 0.5;
    items.push(<Billboard key={`c${k}`} map={orbs.heatPlain} position={[lerp(-0.66, -0.42, phase), y, 0.15]} size={0.16} opacity={fade} />);
    items.push(<Billboard key={`h${k}`} map={orbs.heatPlain} position={[lerp(0.42, 0.68, phase), y, 0.15]} size={0.16} opacity={fade} />);
  }
  return <>{items}</>;
};

const vendingCutaway: PresetSpec = {
  fov: 30,
  auto: ['open'],
  shot: (t) => lerpShot(shot([3.0, 2.8, 10.5], [0, 1.75, 0]), shot([0.1, 2.3, 8.0], [-0.15, 1.75, 0]), t.p('open', 'dolly')),
  render: (t, orbs) => (
    <group rotation={[0, CUT_ROT, 0]}>
      <VendingMachine interior hotRow={2} door={t.p('open', 'smooth')} />
      <HeatFlow t={t} orbs={orbs} amount={t.p('flow', 'smooth')} />
    </group>
  ),
  slots: () => [
    { anchor: toWorld([-0.38, 2.05, 0.25], [0, 0, 0], CUT_ROT), box: { x: 150, y: 240, align: 'left' } },
    { anchor: toWorld([0, 0.62, 0.26], [0, 0, 0], CUT_ROT), box: { x: 150, y: 690, align: 'left' } },
    { anchor: toWorld([0.38, 2.05, 0.25], [0, 0, 0], CUT_ROT), box: { x: 1770, y: 240, align: 'right' } },
    { anchor: toWorld([0.22, 0.3, 0.25], [0, 0, 0], CUT_ROT), box: { x: 1770, y: 690, align: 'right' } },
  ],
};

/* ---------- 4. 使い回し: 冷蔵庫は熱を捨てる / 自販機は熱を回す ---------- */

const FRIDGE_AT: [number, number, number] = [-3.4, 0, 0];
const REUSE_AT: [number, number, number] = [3.1, 0, 0];
const REUSE_ROT = -0.3;
const ARC_TOP: [number, number, number] = [0, 3.75, 0.35];

const heatReuse: PresetSpec = {
  fov: 30,
  auto: ['left'],
  shot: () => shot([0, 3.3, 12.2], [0, 1.75, 0]),
  render: (t, orbs) => {
    const left = t.p('left', 'bouncy');
    const right = t.p('right', 'bouncy');
    const waste: React.ReactNode[] = [];
    if (left > 0.5) {
      for (let k = 0; k < 4; k++) {
        const phase = (((t.local + k * 20) % 80) + 80) % 80 / 80;
        const p = v3(new Vector3(-2.5, 1.2, -0.3), new Vector3(-1.0, 3.8, -2.6), phase);
        waste.push(<Billboard key={k} map={orbs.heat} position={p.toArray()} size={0.75} opacity={(1 - phase) * Math.min(1, phase * 6)} />);
      }
    }
    // 自販機: 冷たい室 → 屋根の上を越えて → 温かい室へ、熱がぴょんと渡る
    const hop = (((t.local % 60) + 60) % 60) / 60;
    const hopPos = new Vector3(lerp(-0.56, 0.56, hop), 2.1 + Math.sin(hop * Math.PI) * (ARC_TOP[1] - 2.1), 0.35);
    return (
      <>
        <group scale={Math.max(0.001, left)}>
          <Fridge position={FRIDGE_AT} rotationY={0.25} />
          <Billboard map={orbs.cold} position={[FRIDGE_AT[0] + 0.1, 1.85, 0.7]} size={0.85} />
        </group>
        {waste}
        {right <= 0.001 ? null : (
          <group position={REUSE_AT} rotation={[0, REUSE_ROT, 0]} scale={right}>
            <VendingMachine interior hotRow={2} door={1} />
            <Billboard map={orbs.cold} position={[-0.56, 2.1, 0.3]} size={0.55} />
            <Billboard map={orbs.heat} position={[0.56, 1.7, 0.3]} size={0.5} />
            <Billboard map={orbs.heat} position={hopPos.toArray()} size={0.6} opacity={Math.min(1, Math.sin(hop * Math.PI) * 3)} />
          </group>
        )}
      </>
    );
  },
  slots: () => [
    { anchor: new Vector3(-1.7, 2.8, -1.6), box: { x: 130, y: 230, align: 'left' } },
    { anchor: toWorld(ARC_TOP, REUSE_AT, REUSE_ROT), box: { x: 1790, y: 230, align: 'right' } },
  ],
};

/* ---------- 5. 電気: 自販機 → 稲妻 → 家、カレンダーがめくれる ---------- */

const CAL = { x: 3.8, y: 2.75, z: 0.4, step: 0.62 };

const vendingEnergy: PresetSpec = {
  fov: 30,
  auto: ['machine'],
  shot: () => shot([0.3, 3.0, 14], [0.3, 1.5, 0]),
  render: (t) => {
    const bolt = t.p('bolt', 'bouncy');
    const house = t.p('house', 'bouncy');
    const monthsSince = t.since('months');
    const months = t.p('months', 'snappy');
    return (
      <>
        <VendingMachine position={[-4.4, 0, 0]} rotationY={0.35} hotRow={2} scale={Math.max(0.001, t.p('machine', 'bouncy'))} />
        {bolt <= 0.001 ? null : (
          <Bolt position={[-1.5, 2.2 + Math.sin(t.local / 16) * 0.08, 0.3]} rotationY={Math.sin(t.local / 28) * 0.55} scale={1.15 * bolt} />
        )}
        {house <= 0.001 ? null : <House position={[1.5, 0, -0.6]} rotationY={-0.25} scale={house} />}
        {months <= 0.001
          ? null
          : Array.from({ length: 12 }, (_, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              // 1〜3月だけ、少しずつ遅れて裏返る (使った月 = 朱色)
              const flip = i < 3 && monthsSince !== null ? clamp01((monthsSince - 18 - i * 12) / 12) : 0;
              const ease = flip * flip * (3 - 2 * flip);
              return (
                <group key={i} position={[CAL.x + col * CAL.step, CAL.y - row * 0.68, CAL.z]} scale={months}>
                  <CalendarTile month={i + 1} position={[0, 0, 0]} flip={ease} />
                </group>
              );
            })}
      </>
    );
  },
  slots: () => [{ anchor: new Vector3(CAL.x + CAL.step, CAL.y + 0.32, CAL.z), box: { x: 1820, y: 130, align: 'right' } }],
  stat: { align: 'left', x: 560, y: 120 },
};

export const PRESETS = { vendingCount, vendingHotCold, vendingCutaway, heatReuse, vendingEnergy } as const;
export type ObjectPreset = keyof typeof PRESETS;

