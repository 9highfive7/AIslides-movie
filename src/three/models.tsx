import React from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { Face, G, Part as P } from './toon';
import { SHAPES, isShapeName, type ShapeName } from './catalog';

/**
 * 3D オブジェクトの形。すべて「床 (y=0) に置いて高さ約1.6・幅約1.8以内」にそろえてあるので、
 * 並べ方 (src/three/stage.ts) は形を気にせず配置できる。c はメインの色。
 */
type Model = React.FC<{ c: string }>;
type V = [number, number, number];

const WHITE = new THREE.Color('#FFFFFF');
const BLACK = new THREE.Color('#000000');
/** 明るく (amt > 0) / 暗く (amt < 0) した色 */
const tint = (c: string, amt: number): string =>
  `#${new THREE.Color(c).lerp(amt > 0 ? WHITE : BLACK, Math.abs(amt)).getHexString()}`;

const INK = '#2B2D42';
const SKIN = '#FFD8B5';
const WOOD = '#A0522D';
const LEAF = '#51CF66';
const GOLD = '#FCC419';
const SILVER = '#CED4DA';
const GLASS = '#A5D8FF';

const checkCurve = () => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.55, 0.85, 0), new THREE.Vector3(-0.15, 0.4, 0)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.15, 0.4, 0), new THREE.Vector3(0.6, 1.4, 0)));
  return path;
};

const questionCurve = () =>
  new THREE.CatmullRomCurve3(
    [
      [-0.38, 1.22],
      [-0.28, 1.48],
      [0, 1.6],
      [0.3, 1.5],
      [0.4, 1.24],
      [0.26, 1.0],
      [0.02, 0.86],
      [0, 0.62],
    ].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  );

/** しずくの輪郭 (下が丸く上がとがる) */
const DROP_PROFILE: Array<[number, number]> = Array.from({ length: 33 }, (_, i) => {
  const t = (i / 32) * Math.PI;
  return [0.62 * Math.sin(t) * Math.sin(t / 2), 0.8 + 0.8 * Math.cos(t)];
}).reverse() as Array<[number, number]>;

const Cube: Model = ({ c }) => <P geo={G.rbox(1.3, 1.3, 1.3, 0.14)} color={c} position={[0, 0.65, 0]} />;

const Ball: Model = ({ c }) => <P geo={G.sphere(0.75)} color={c} position={[0, 0.75, 0]} />;

const Cylinder: Model = ({ c }) => <P geo={G.cylinder(0.6, 0.6, 1.4)} color={c} position={[0, 0.7, 0]} />;

const Cone: Model = ({ c }) => <P geo={G.cone(0.72, 1.5)} color={c} position={[0, 0.75, 0]} />;

const Pyramid: Model = ({ c }) => (
  <P geo={G.cone(0.95, 1.35, 4)} color={c} position={[0, 0.675, 0]} rotation={[0, Math.PI / 4, 0]} />
);

const Ring: Model = ({ c }) => <P geo={G.torus(0.58, 0.24)} color={c} position={[0, 0.85, 0]} />;

const Star: Model = ({ c }) => <P geo={G.star()} color={c} position={[0, 0.88, 0]} emissive={0.15} />;

const Heart: Model = ({ c }) => <P geo={G.heart()} color={c} position={[0, 0.8, 0]} />;

const ArrowUp: Model = ({ c }) => <P geo={G.arrow()} color={c} position={[0, 0.82, 0]} />;

const ArrowDown: Model = ({ c }) => <P geo={G.arrow()} color={c} position={[0, 0.82, 0]} rotation={[0, 0, Math.PI]} />;

const Question: Model = ({ c }) => (
  <group>
    <P geo={G.tube('question', questionCurve, 0.13)} color={c} />
    <P geo={G.sphere(0.16)} color={c} position={[0, 0.25, 0]} />
  </group>
);

const Check: Model = ({ c }) => <P geo={G.tube('check', checkCurve, 0.15)} color={c} />;

const Cross: Model = ({ c }) => (
  <group position={[0, 0.8, 0]}>
    <P geo={G.rbox(0.3, 1.5, 0.3, 0.12)} color={c} rotation={[0, 0, Math.PI / 4]} />
    <P geo={G.rbox(0.3, 1.5, 0.3, 0.12)} color={c} rotation={[0, 0, -Math.PI / 4]} />
  </group>
);

const Sun: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.85, 0]}>
      <group rotation={[0, 0, frame / 60]}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <P
              key={i}
              geo={G.cone(0.13, 0.3, 16)}
              color={tint(c, -0.08)}
              position={[Math.cos(a) * 0.78, Math.sin(a) * 0.78, -0.05]}
              rotation={[0, 0, a - Math.PI / 2]}
              scale={[1, 1, 0.45]}
              emissive={0.35}
            />
          );
        })}
      </group>
      <P geo={G.sphere(0.58)} color={c} emissive={0.35} />
      <Face y={0} z={0.55} w={0.55} />
    </group>
  );
};

const Moon: Model = ({ c }) => (
  <group position={[0, 0.85, 0]}>
    <P geo={G.crescent()} color={c} emissive={0.25} />
    <TinyStar x={0.55} y={0.55} />
  </group>
);

const TinyStar: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <P geo={G.star(0.85, 0.38, 0.28)} color={GOLD} position={[x, y, 0]} scale={0.22} emissive={0.3} />
);

/** 球面上に貼る大陸 (法線方向へ向ける) */
const CONTINENTS: Array<{ dir: V; s: [number, number] }> = [
  { dir: [0.35, 0.45, 0.82], s: [0.36, 0.28] },
  { dir: [-0.5, 0.1, 0.86], s: [0.3, 0.42] },
  { dir: [0.2, -0.5, 0.84], s: [0.26, 0.22] },
  { dir: [-0.85, 0.35, -0.4], s: [0.4, 0.3] },
  { dir: [0.8, -0.1, -0.6], s: [0.34, 0.3] },
  { dir: [0, 0.95, 0.1], s: [0.32, 0.32] },
];
const continentPose = CONTINENTS.map(({ dir, s }) => {
  const n = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const e = new THREE.Euler().setFromQuaternion(q);
  return { pos: n.multiplyScalar(0.7).toArray() as V, rot: [e.x, e.y, e.z] as V, s };
});

const Earth: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.82, 0]} rotation={[0.35, frame / 80, 0.2]}>
      <P geo={G.sphere(0.76)} color={c} />
      {continentPose.map((p, i) => (
        <P key={i} geo={G.sphere(1)} color={LEAF} position={p.pos} rotation={p.rot} scale={[p.s[0], p.s[1], 0.12]} outline={false} />
      ))}
    </group>
  );
};

const Cloud: Model = ({ c }) => (
  <group position={[0, 0.35, 0]}>
    <P geo={G.sphere(0.42)} color={c} position={[-0.5, 0.45, 0]} />
    <P geo={G.sphere(0.55)} color={c} position={[0, 0.65, 0]} />
    <P geo={G.sphere(0.42)} color={c} position={[0.5, 0.45, 0]} />
    <P geo={G.sphere(0.36)} color={c} position={[-0.22, 0.32, 0.2]} />
    <P geo={G.sphere(0.36)} color={c} position={[0.25, 0.32, 0.2]} />
    <Face y={0.5} z={0.52} w={0.45} />
  </group>
);

const Drop: Model = ({ c }) => (
  <group>
    <P geo={G.lathe('drop', DROP_PROFILE)} color={c} />
    <Face y={0.5} z={0.52} w={0.45} />
  </group>
);

const Fire: Model = ({ c }) => {
  const frame = useCurrentFrame();
  const flick = (k: number) => 1 + Math.sin(frame / 3 + k) * 0.06;
  return (
    <group>
      <P geo={G.lathe('drop', DROP_PROFILE)} color={c} scale={[1.05, 1.05 * flick(0), 1.05]} emissive={0.4} />
      <P geo={G.lathe('drop', DROP_PROFILE)} color={GOLD} position={[0, 0.02, 0.18]} scale={[0.68, 0.72 * flick(2), 0.68]} emissive={0.5} />
      <P geo={G.lathe('drop', DROP_PROFILE)} color="#FFF3BF" position={[0, 0.03, 0.34]} scale={[0.36, 0.4 * flick(4), 0.36]} emissive={0.6} outline={false} />
    </group>
  );
};

const Tree: Model = ({ c }) => (
  <group>
    <P geo={G.cylinder(0.14, 0.2, 0.7)} color={WOOD} position={[0, 0.35, 0]} />
    <P geo={G.sphere(0.5)} color={c} position={[0, 1.05, 0]} />
    <P geo={G.sphere(0.38)} color={tint(c, -0.1)} position={[-0.42, 0.85, 0.05]} />
    <P geo={G.sphere(0.38)} color={tint(c, 0.1)} position={[0.42, 0.88, 0.05]} />
    <P geo={G.sphere(0.12)} color="#FA5252" position={[0.2, 0.95, 0.45]} outline={false} />
    <P geo={G.sphere(0.1)} color="#FA5252" position={[-0.3, 1.2, 0.36]} outline={false} />
  </group>
);

const Flower: Model = ({ c }) => (
  <group>
    <P geo={G.cylinder(0.05, 0.06, 1.0)} color={LEAF} position={[0, 0.5, 0]} />
    <P geo={G.sphere(0.22)} color={LEAF} position={[0.17, 0.35, 0]} scale={[1, 0.4, 0.5]} rotation={[0, 0, 0.5]} />
    <group position={[0, 1.15, 0]}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <P key={i} geo={G.sphere(0.24)} color={c} position={[Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0]} scale={[1, 0.7, 0.35]} rotation={[0, 0, a]} />
        );
      })}
      <P geo={G.sphere(0.19)} color={GOLD} position={[0, 0, 0.06]} />
    </group>
  </group>
);

const Sprout: Model = ({ c }) => (
  <group>
    <P geo={G.cylinder(0.42, 0.32, 0.55)} color="#E8590C" position={[0, 0.275, 0]} />
    <P geo={G.cylinder(0.38, 0.38, 0.04)} color="#5C3D2E" position={[0, 0.54, 0]} outline={false} />
    <P geo={G.cylinder(0.04, 0.05, 0.5)} color={tint(c, -0.15)} position={[0, 0.8, 0]} />
    <P geo={G.sphere(0.25)} color={c} position={[-0.22, 1.08, 0]} scale={[1, 0.45, 0.6]} rotation={[0, 0, 0.45]} />
    <P geo={G.sphere(0.25)} color={c} position={[0.22, 1.08, 0]} scale={[1, 0.45, 0.6]} rotation={[0, 0, -0.45]} />
  </group>
);

const Mountain: Model = ({ c }) => (
  <group>
    <P geo={G.cone(0.6, 0.95, 7)} color={tint(c, -0.12)} position={[0.55, 0.475, -0.3]} />
    <P geo={G.cone(0.85, 1.5, 7)} color={c} position={[-0.1, 0.75, 0]} />
    <P geo={G.cone(0.3, 0.53, 7)} color="#FFFFFF" position={[-0.1, 1.24, 0]} />
  </group>
);

const Fish: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.8, 0]}>
      <P geo={G.sphere(0.55)} color={c} scale={[1.15, 0.75, 0.5]} />
      <group position={[-0.62, 0, 0]} rotation={[0, Math.sin(frame / 6) * 0.35, 0]}>
        <P geo={G.cone(0.32, 0.45, 4)} color={tint(c, -0.15)} position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.35]} />
      </group>
      <P geo={G.cone(0.18, 0.3, 4)} color={tint(c, -0.15)} position={[0, 0.42, 0]} scale={[1.4, 1, 0.3]} />
      <P geo={G.sphere(0.11)} color="#FFFFFF" position={[0.38, 0.1, 0.22]} />
      <P geo={G.sphere(0.06)} color={INK} position={[0.41, 0.1, 0.3]} outline={false} />
    </group>
  );
};

const Person: Model = ({ c }) => (
  <group>
    <P geo={G.capsule(0.12, 0.3)} color="#495057" position={[-0.14, 0.27, 0]} />
    <P geo={G.capsule(0.12, 0.3)} color="#495057" position={[0.14, 0.27, 0]} />
    <P geo={G.capsule(0.32, 0.35)} color={c} position={[0, 0.72, 0]} />
    <P geo={G.capsule(0.09, 0.4)} color={c} position={[-0.42, 0.72, 0]} rotation={[0, 0, -0.35]} />
    <P geo={G.capsule(0.09, 0.4)} color={c} position={[0.42, 0.72, 0]} rotation={[0, 0, 0.35]} />
    <P geo={G.sphere(0.36)} color={SKIN} position={[0, 1.35, 0]} />
    <P geo={G.sphere(0.38)} color="#5C3D2E" position={[0, 1.45, -0.05]} scale={[1, 0.75, 0.95]} />
    <Face y={1.3} z={0.33} w={0.36} />
  </group>
);

const Robot: Model = ({ c }) => {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame / 9) > 0.92 ? 0.15 : 1;
  return (
    <group>
      <P geo={G.rbox(0.28, 0.3, 0.3, 0.06)} color="#868E96" position={[-0.22, 0.15, 0]} />
      <P geo={G.rbox(0.28, 0.3, 0.3, 0.06)} color="#868E96" position={[0.22, 0.15, 0]} />
      <P geo={G.rbox(0.9, 0.7, 0.6, 0.12)} color={c} position={[0, 0.65, 0]} />
      <P geo={G.cylinder(0.12, 0.12, 0.04)} color="#FA5252" position={[0, 0.7, 0.31]} rotation={[Math.PI / 2, 0, 0]} emissive={0.4} />
      <P geo={G.capsule(0.08, 0.35)} color="#868E96" position={[-0.55, 0.65, 0]} rotation={[0, 0, -0.2]} />
      <P geo={G.capsule(0.08, 0.35)} color="#868E96" position={[0.55, 0.65, 0]} rotation={[0, 0, 0.2]} />
      <P geo={G.rbox(0.8, 0.55, 0.55, 0.14)} color={tint(c, 0.25)} position={[0, 1.3, 0]} />
      <P geo={G.sphere(0.09)} color="#22B8CF" position={[-0.18, 1.33, 0.27]} scale={[1, blink, 0.5]} emissive={0.8} outline={false} />
      <P geo={G.sphere(0.09)} color="#22B8CF" position={[0.18, 1.33, 0.27]} scale={[1, blink, 0.5]} emissive={0.8} outline={false} />
      <P geo={G.cylinder(0.025, 0.025, 0.25)} color="#868E96" position={[0, 1.7, 0]} />
      <P geo={G.sphere(0.07)} color="#FA5252" position={[0, 1.84, 0]} emissive={0.5} />
    </group>
  );
};

const House: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(1.2, 0.85, 1.0, 0.06)} color="#FFF4E6" position={[0, 0.425, 0]} />
    <P geo={G.cone(1.0, 0.65, 4)} color={c} position={[0, 1.17, 0]} rotation={[0, Math.PI / 4, 0]} />
    <P geo={G.rbox(0.3, 0.48, 0.06, 0.03)} color={WOOD} position={[-0.25, 0.24, 0.5]} />
    <P geo={G.rbox(0.3, 0.26, 0.05, 0.03)} color={GLASS} position={[0.28, 0.5, 0.5]} emissive={0.2} />
    <P geo={G.rbox(0.16, 0.36, 0.16, 0.03)} color="#868E96" position={[0.35, 1.3, -0.15]} />
  </group>
);

const Building: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(0.95, 1.9, 0.8, 0.06)} color={c} position={[0, 0.95, 0]} />
    {Array.from({ length: 15 }, (_, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return (
        <P
          key={i}
          geo={G.box(0.18, 0.2, 0.03)}
          color={(i * 7) % 5 === 0 ? '#FFE066' : GLASS}
          position={[-0.28 + col * 0.28, 0.4 + row * 0.32, 0.41]}
          emissive={0.25}
          outline={false}
        />
      );
    })}
  </group>
);

const Wheel: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}>
    <P geo={G.cylinder(0.22, 0.22, 0.14)} color="#343A40" />
    <P geo={G.cylinder(0.1, 0.1, 0.16)} color={SILVER} outline={false} />
  </group>
);

const Car: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(1.6, 0.45, 0.85, 0.14)} color={c} position={[0, 0.45, 0]} />
    <P geo={G.rbox(0.9, 0.42, 0.75, 0.14)} color={tint(c, 0.12)} position={[-0.1, 0.85, 0]} />
    <P geo={G.box(0.72, 0.26, 0.77)} color={GLASS} position={[-0.1, 0.86, 0]} emissive={0.15} outline={false} />
    <P geo={G.sphere(0.08)} color="#FFE066" position={[0.8, 0.5, 0.28]} emissive={0.6} outline={false} />
    <Wheel x={-0.5} z={0.42} />
    <Wheel x={0.5} z={0.42} />
    <Wheel x={-0.5} z={-0.42} />
    <Wheel x={0.5} z={-0.42} />
  </group>
);

const ROCKET_BODY: Array<[number, number]> = [
  [0, 0],
  [0.28, 0.02],
  [0.36, 0.3],
  [0.38, 0.7],
  [0.33, 1.0],
];

const Rocket: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.3 + Math.sin(frame / 10) * 0.04, 0]}>
      <P geo={G.lathe('rocket', ROCKET_BODY)} color={c} />
      <P geo={G.cone(0.33, 0.45)} color="#FA5252" position={[0, 1.22, 0]} />
      <P geo={G.torus(0.13, 0.04)} color={SILVER} position={[0, 0.68, 0.36]} />
      <P geo={G.sphere(0.12)} color={GLASS} position={[0, 0.68, 0.31]} scale={[1, 1, 0.5]} emissive={0.2} outline={false} />
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return (
          <P
            key={i}
            geo={G.rbox(0.06, 0.38, 0.3, 0.02)}
            color="#FA5252"
            position={[Math.cos(a) * 0.4, 0.15, Math.sin(a) * 0.4]}
            rotation={[0, -a, 0]}
          />
        );
      })}
      <P
        geo={G.cone(0.2, 0.42)}
        color="#FF922B"
        position={[0, -0.18, 0]}
        rotation={[Math.PI, 0, 0]}
        scale={[1, 1 + Math.sin(frame / 2) * 0.15, 1]}
        emissive={0.6}
        outline={false}
      />
    </group>
  );
};

const Book: Model = ({ c }) => (
  <group position={[0, 0.55, 0]} rotation={[0.55, 0, 0]}>
    <group rotation={[0, 0, 0.18]} position={[-0.38, 0, 0]}>
      <P geo={G.rbox(0.8, 0.07, 1.05, 0.03)} color={c} />
      <P geo={G.rbox(0.74, 0.08, 0.98, 0.02)} color="#FFFFFF" position={[0.02, 0.07, 0]} />
    </group>
    <group rotation={[0, 0, -0.18]} position={[0.38, 0, 0]}>
      <P geo={G.rbox(0.8, 0.07, 1.05, 0.03)} color={c} />
      <P geo={G.rbox(0.74, 0.08, 0.98, 0.02)} color="#FFFFFF" position={[-0.02, 0.07, 0]} />
    </group>
    {[0, 1, 2].map((i) => (
      <P key={i} geo={G.box(0.5, 0.01, 0.04)} color="#ADB5BD" position={[-0.4, 0.13 + i * 0.001, -0.25 + i * 0.22]} rotation={[0, 0, 0.18]} outline={false} />
    ))}
  </group>
);

const BULB_NECK: Array<[number, number]> = [
  [0.18, 0],
  [0.2, 0.15],
  [0.3, 0.32],
];

const Lightbulb: Model = ({ c }) => (
  <group>
    <P geo={G.cylinder(0.2, 0.18, 0.3)} color={SILVER} position={[0, 0.2, 0]} />
    <P geo={G.torus(0.2, 0.035)} color="#868E96" position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
    <P geo={G.torus(0.2, 0.035)} color="#868E96" position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
    <P geo={G.lathe('bulb-neck', BULB_NECK)} color={c} position={[0, 0.35, 0]} emissive={0.45} />
    <P geo={G.sphere(0.5)} color={c} position={[0, 1.05, 0]} emissive={0.45} />
    <P geo={G.sphere(0.12)} color="#FFFFFF" position={[-0.2, 1.25, 0.36]} outline={false} emissive={1} />
  </group>
);

const Coin: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.8, 0]} rotation={[0, frame / 18, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <P geo={G.cylinder(0.68, 0.68, 0.16)} color={c} emissive={0.12} />
        <P geo={G.cylinder(0.5, 0.5, 0.2)} color={tint(c, 0.25)} outline={false} emissive={0.12} />
      </group>
      <P geo={G.star(0.85, 0.38, 0.28)} color={tint(c, -0.15)} position={[0, 0, 0.1]} scale={0.32} outline={false} />
      <P geo={G.star(0.85, 0.38, 0.28)} color={tint(c, -0.15)} position={[0, 0, -0.1]} scale={0.32} outline={false} />
    </group>
  );
};

const Gift: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(1.1, 0.95, 1.1, 0.08)} color={c} position={[0, 0.475, 0]} />
    <P geo={G.rbox(1.2, 0.2, 1.2, 0.06)} color={tint(c, -0.1)} position={[0, 0.98, 0]} />
    <P geo={G.box(0.2, 1.17, 1.22)} color={GOLD} position={[0, 0.56, 0]} outline={false} />
    <P geo={G.box(1.22, 1.17, 0.2)} color={GOLD} position={[0, 0.56, 0]} outline={false} />
    <P geo={G.torus(0.2, 0.07)} color={GOLD} position={[-0.2, 1.22, 0]} rotation={[0, 0, 0.6]} />
    <P geo={G.torus(0.2, 0.07)} color={GOLD} position={[0.2, 1.22, 0]} rotation={[0, 0, -0.6]} />
  </group>
);

const Apple: Model = ({ c }) => (
  <group>
    <P geo={G.sphere(0.62)} color={c} position={[0, 0.6, 0]} scale={[1.05, 0.92, 1]} />
    <P geo={G.cylinder(0.04, 0.05, 0.3)} color={WOOD} position={[0, 1.22, 0]} rotation={[0, 0, -0.2]} />
    <P geo={G.sphere(0.18)} color={LEAF} position={[0.18, 1.25, 0]} scale={[1, 0.45, 0.5]} rotation={[0, 0, -0.5]} />
    <P geo={G.sphere(0.1)} color="#FFFFFF" position={[-0.25, 0.85, 0.48]} scale={[1, 1.4, 0.4]} outline={false} opacity={0.9} />
  </group>
);

const Cake: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group>
      <P geo={G.cylinder(0.72, 0.72, 0.6)} color={c} position={[0, 0.3, 0]} />
      <P geo={G.cylinder(0.74, 0.74, 0.1)} color="#FFFFFF" position={[0, 0.62, 0]} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        return <P key={i} geo={G.sphere(0.12)} color="#FA5252" position={[Math.cos(a) * 0.5, 0.74, Math.sin(a) * 0.5]} />;
      })}
      <P geo={G.cylinder(0.05, 0.05, 0.4)} color="#74C0FC" position={[0, 0.88, 0]} />
      <P
        geo={G.lathe('drop', DROP_PROFILE)}
        color="#FFA94D"
        position={[0, 1.08, 0]}
        scale={[0.12, 0.13 + Math.sin(frame / 3) * 0.01, 0.12]}
        emissive={0.8}
        outline={false}
      />
    </group>
  );
};

const Battery: Model = ({ c }) => (
  <group>
    <P geo={G.cylinder(0.38, 0.38, 1.3)} color="#495057" position={[0, 0.65, 0]} />
    <P geo={G.cylinder(0.395, 0.395, 0.85)} color={c} position={[0, 0.48, 0]} emissive={0.15} />
    <P geo={G.cylinder(0.15, 0.15, 0.14)} color={SILVER} position={[0, 1.37, 0]} />
    <P geo={G.arrow(0.08)} color="#FFE066" position={[0, 0.55, 0.4]} scale={0.32} rotation={[0, 0, -0.35]} emissive={0.6} outline={false} />
  </group>
);

const Phone: Model = ({ c }) => (
  <group position={[0, 0.78, 0]}>
    <P geo={G.rbox(0.8, 1.5, 0.12, 0.1)} color={c} />
    <P geo={G.rbox(0.7, 1.3, 0.02, 0.06)} color="#4DABF7" position={[0, 0, 0.065]} emissive={0.35} outline={false} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <P
        key={i}
        geo={G.rbox(0.16, 0.16, 0.02, 0.04)}
        color={['#FFD43B', '#FF6B6B', '#51CF66', '#FFFFFF', '#845EF7', '#FF922B'][i]}
        position={[-0.2 + (i % 3) * 0.2, 0.4 - Math.floor(i / 3) * 0.24, 0.08]}
        emissive={0.3}
        outline={false}
      />
    ))}
  </group>
);

const Computer: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(0.6, 0.06, 0.4, 0.03)} color={tint(c, -0.2)} position={[0, 0.03, -0.1]} />
    <P geo={G.cylinder(0.06, 0.06, 0.4)} color={tint(c, -0.2)} position={[0, 0.25, -0.1]} />
    <P geo={G.rbox(1.6, 1.0, 0.1, 0.06)} color={c} position={[0, 0.95, -0.1]} />
    <P geo={G.rbox(1.45, 0.85, 0.02, 0.04)} color="#339AF0" position={[0, 0.95, -0.04]} emissive={0.35} outline={false} />
    <P geo={G.rbox(0.5, 0.08, 0.02, 0.03)} color="#FFFFFF" position={[-0.3, 1.12, -0.02]} emissive={0.5} outline={false} />
    <P geo={G.rbox(0.8, 0.08, 0.02, 0.03)} color="#A5D8FF" position={[-0.15, 0.96, -0.02]} emissive={0.5} outline={false} />
    <P geo={G.rbox(1.3, 0.06, 0.4, 0.03)} color={tint(c, 0.2)} position={[0, 0.03, 0.42]} />
  </group>
);

const Chip: Model = ({ c }) => (
  <group position={[0, 0.85, 0]}>
    <P geo={G.rbox(1.0, 1.0, 0.18, 0.06)} color={c} />
    <P geo={G.rbox(0.55, 0.55, 0.04, 0.04)} color="#22B8CF" position={[0, 0, 0.1]} emissive={0.45} outline={false} />
    {Array.from({ length: 16 }, (_, i) => {
      const side = Math.floor(i / 4);
      const k = -0.33 + (i % 4) * 0.22;
      const pos: V =
        side === 0 ? [k, 0.58, 0] : side === 1 ? [k, -0.58, 0] : side === 2 ? [0.58, k, 0] : [-0.58, k, 0];
      const vertical = side < 2;
      return <P key={i} geo={G.box(vertical ? 0.08 : 0.18, vertical ? 0.18 : 0.08, 0.06)} color={GOLD} position={pos} outline={false} />;
    })}
  </group>
);

const Server: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0.24 + i * 0.5, 0]}>
          <P geo={G.rbox(1.2, 0.42, 0.9, 0.08)} color={c} />
          <P geo={G.box(0.55, 0.05, 0.02)} color={INK} position={[-0.18, 0, 0.46]} outline={false} />
          <P
            geo={G.sphere(0.05)}
            color={(Math.floor(frame / 8) + i) % 3 === 0 ? '#FFE066' : '#51CF66'}
            position={[0.35, 0, 0.46]}
            emissive={0.8}
            outline={false}
          />
          <P geo={G.sphere(0.05)} color="#339AF0" position={[0.48, 0, 0.46]} emissive={0.8} outline={false} />
        </group>
      ))}
    </group>
  );
};

const Letter: Model = ({ c }) => (
  <group position={[0, 0.72, 0]}>
    <P geo={G.rbox(1.4, 0.9, 0.1, 0.04)} color={c} />
    <P geo={G.triangle(1.38, 0.55, 0.02)} color={tint(c, -0.1)} position={[0, 0.17, 0.065]} />
    <P geo={G.heart(0.3)} color="#FA5252" position={[0, -0.05, 0.1]} scale={0.18} />
  </group>
);

const Speech: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.95, 0]}>
      <P geo={G.rbox(1.55, 1.0, 0.36, 0.3)} color={c} />
      <P geo={G.cone(0.18, 0.4, 4)} color={c} position={[-0.38, -0.6, 0]} rotation={[0, 0, 0.5]} />
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          geo={G.sphere(0.11)}
          color={['#339AF0', '#FCC419', '#FA5252'][i]}
          position={[-0.36 + i * 0.36, Math.max(0, Math.sin(frame / 5 - i * 0.9)) * 0.12, 0.2]}
          outline={false}
        />
      ))}
    </group>
  );
};

const Clock: Model = ({ c }) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, 0.85, 0]}>
      <P geo={G.sphere(0.2)} color="#FA5252" position={[-0.42, 0.62, -0.05]} scale={[1, 0.8, 1]} />
      <P geo={G.sphere(0.2)} color="#FA5252" position={[0.42, 0.62, -0.05]} scale={[1, 0.8, 1]} />
      <P geo={G.cylinder(0.04, 0.04, 0.3)} color="#868E96" position={[-0.4, -0.7, 0]} rotation={[0, 0, -0.5]} />
      <P geo={G.cylinder(0.04, 0.04, 0.3)} color="#868E96" position={[0.4, -0.7, 0]} rotation={[0, 0, 0.5]} />
      <group rotation={[Math.PI / 2, 0, 0]}>
        <P geo={G.cylinder(0.72, 0.72, 0.3)} color="#FA5252" />
        <P geo={G.cylinder(0.6, 0.6, 0.32)} color={c} outline={false} />
      </group>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <P key={i} geo={G.sphere(0.035)} color={INK} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.17]} outline={false} />;
      })}
      <group position={[0, 0, 0.18]} rotation={[0, 0, -frame / 40]}>
        <P geo={G.box(0.05, 0.42, 0.02)} color={INK} position={[0, 0.19, 0]} outline={false} />
      </group>
      <group position={[0, 0, 0.19]} rotation={[0, 0, -frame / 480 - 1]}>
        <P geo={G.box(0.07, 0.28, 0.02)} color={INK} position={[0, 0.12, 0]} outline={false} />
      </group>
      <P geo={G.sphere(0.05)} color="#FA5252" position={[0, 0, 0.2]} outline={false} />
    </group>
  );
};

const Magnifier: Model = ({ c }) => (
  <group position={[0, 0.2, 0]}>
    <P geo={G.capsule(0.1, 0.55)} color={WOOD} position={[0.45, 0.3, 0]} rotation={[0, 0, 0.75]} />
    <P geo={G.torus(0.45, 0.09)} color={c} position={[-0.1, 0.98, 0]} />
    <P geo={G.cylinder(0.42, 0.42, 0.05)} color={GLASS} position={[-0.1, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]} opacity={0.55} />
    <P geo={G.sphere(0.08)} color="#FFFFFF" position={[-0.25, 1.15, 0.05]} outline={false} emissive={1} />
  </group>
);

const TROPHY_CUP: Array<[number, number]> = [
  [0.08, 0],
  [0.25, 0.08],
  [0.45, 0.35],
  [0.55, 0.7],
  [0.58, 0.72],
];

const Trophy: Model = ({ c }) => (
  <group>
    <P geo={G.rbox(0.8, 0.22, 0.55, 0.05)} color="#5C3D2E" position={[0, 0.11, 0]} />
    <P geo={G.cylinder(0.08, 0.14, 0.4)} color={c} position={[0, 0.42, 0]} emissive={0.15} />
    <P geo={G.lathe('trophy', TROPHY_CUP)} color={c} position={[0, 0.6, 0]} emissive={0.15} />
    <P geo={G.torus(0.2, 0.06, Math.PI)} color={c} position={[-0.55, 1.05, 0]} rotation={[0, 0, Math.PI / 2]} emissive={0.15} />
    <P geo={G.torus(0.2, 0.06, Math.PI)} color={c} position={[0.55, 1.05, 0]} rotation={[0, 0, -Math.PI / 2]} emissive={0.15} />
    <P geo={G.star(0.85, 0.38, 0.28)} color="#FFFFFF" position={[0, 1.0, 0.45]} scale={0.22} emissive={0.4} outline={false} />
  </group>
);

const Lock: Model = ({ c }) => (
  <group>
    <P geo={G.torus(0.3, 0.08, Math.PI)} color={SILVER} position={[0, 0.95, 0]} />
    <P geo={G.cylinder(0.08, 0.08, 0.2)} color={SILVER} position={[-0.3, 0.88, 0]} />
    <P geo={G.cylinder(0.08, 0.08, 0.2)} color={SILVER} position={[0.3, 0.88, 0]} />
    <P geo={G.rbox(1.0, 0.8, 0.42, 0.1)} color={c} position={[0, 0.42, 0]} emissive={0.1} />
    <P geo={G.cylinder(0.09, 0.09, 0.05)} color={INK} position={[0, 0.5, 0.21]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
    <P geo={G.box(0.07, 0.2, 0.05)} color={INK} position={[0, 0.38, 0.21]} outline={false} />
  </group>
);

const Magnet: Model = ({ c }) => (
  <group position={[0, 0.25, 0]}>
    <P geo={G.torus(0.45, 0.2, Math.PI)} color={c} position={[0, 0.95, 0]} />
    <P geo={G.cylinder(0.2, 0.2, 0.55)} color={c} position={[-0.45, 0.68, 0]} />
    <P geo={G.cylinder(0.2, 0.2, 0.55)} color={c} position={[0.45, 0.68, 0]} />
    <P geo={G.cylinder(0.2, 0.2, 0.25)} color={SILVER} position={[-0.45, 0.28, 0]} />
    <P geo={G.cylinder(0.2, 0.2, 0.25)} color={SILVER} position={[0.45, 0.28, 0]} />
  </group>
);

const MODELS: Record<ShapeName, Model> = {
  cube: Cube,
  ball: Ball,
  cylinder: Cylinder,
  cone: Cone,
  pyramid: Pyramid,
  ring: Ring,
  star: Star,
  heart: Heart,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  question: Question,
  check: Check,
  cross: Cross,
  sun: Sun,
  moon: Moon,
  earth: Earth,
  cloud: Cloud,
  drop: Drop,
  fire: Fire,
  tree: Tree,
  flower: Flower,
  sprout: Sprout,
  mountain: Mountain,
  fish: Fish,
  person: Person,
  robot: Robot,
  house: House,
  building: Building,
  car: Car,
  rocket: Rocket,
  book: Book,
  lightbulb: Lightbulb,
  coin: Coin,
  gift: Gift,
  apple: Apple,
  cake: Cake,
  battery: Battery,
  phone: Phone,
  computer: Computer,
  chip: Chip,
  server: Server,
  letter: Letter,
  speech: Speech,
  clock: Clock,
  magnifier: Magnifier,
  trophy: Trophy,
  lock: Lock,
  magnet: Magnet,
};

/** 形キーと色からオブジェクトを描く。未登録の形は「はてな」を出す */
export const ShapeModel: React.FC<{ shape: string; color?: string }> = ({ shape, color }) => {
  const key: ShapeName = isShapeName(shape) ? shape : 'question';
  const Component = MODELS[key];
  return <Component c={color ?? SHAPES[key].color} />;
};
