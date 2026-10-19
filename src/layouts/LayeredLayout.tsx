import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Img, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useSceneContext } from '../context/SceneContext';
import { SPRINGS, springFrom } from '../animation/presets';
import { Callout, StatOverlay, TitleOverlay } from '../three/ObjectScene';
import type { LayeredContent } from '../schemas';

type LayeredObject = LayeredContent['objects'][number];
type CameraMode = LayeredContent['camera'];

const W = 1920;
const H = 1080;

/** 層ごとの奥行き (手前ほど大きく動く)。視差で立体的に見せる */
const DEPTH = { background: 0.25, objects: 0.6, foreground: 1.4 } as const;
/** pan: 奥行き 1 の層がシーンの間に横へ流れる距離 [px] */
const PAN_PX = 120;
/** zoom: 奥行き 1 の層がシーンの間に寄る倍率 */
const ZOOM = 0.12;
/** 流れても画面の端が見えないよう、背景と手前を少し大きく敷く倍率 */
const BLEED = { background: 1.04, foreground: 1.12 } as const;

/** zoom で寄る中心 (画面の下寄り。物が上の見出しへ伸びすぎないように) */
const ZOOM_ORIGIN = '50% 80%';
/** focus で物を大きくする量 (割合と、背の高い物でも超えない上限 [px]) */
const FOCUS_GROW = { ratio: 0.06, maxPx: 28 } as const;

/** 注釈の箱を置ける下限 (これより下は字幕の領域) */
const CALLOUT_MAX_TOP = 760;

const resolveSrc = (src: string): string => (/^https?:\/\//.test(src) ? src : staticFile(src));

/** シーンの進み具合 d (0 → 1) における、奥行き depth の層の動き */
const layerMotion = (camera: CameraMode, depth: number, d: number): { x: number; scale: number } => {
  switch (camera) {
    case 'pan':
      return { x: (0.5 - d) * PAN_PX * depth, scale: 1 };
    case 'zoom':
      return { x: 0, scale: 1 + ZOOM * depth * d };
    case 'none':
      return { x: 0, scale: 1 };
  }
};

const layerTransform = (m: { x: number; scale: number }, bleed = 1): string => `translateX(${m.x}px) scale(${m.scale * bleed})`;

/** 物の画像の縦横比 (幅 / 高さ)。読み込むまで描画を待つ */
const useAspects = (srcs: string[]): number[] | null => {
  const [aspects, setAspects] = useState<number[] | null>(null);
  const [handle] = useState(() => delayRender('layered: 物の画像の大きさを読み込み中'));
  const released = useRef(false);
  const key = srcs.join('\n');
  useEffect(() => {
    let alive = true;
    Promise.all(
      key.split('\n').map(
        (src) =>
          new Promise<number>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1);
            img.onerror = () => resolve(1);
            img.src = src;
          }),
      ),
    ).then((list) => {
      if (alive) {
        setAspects(list);
      }
      if (!released.current) {
        released.current = true;
        continueRender(handle);
      }
    });
    return () => {
      alive = false;
    };
  }, [handle, key]);
  return aspects;
};

/** 物の画面上の位置 (層の動きをかける前) */
interface Rect {
  left: number;
  top: number;
  w: number;
  h: number;
}

const rectOf = (obj: LayeredObject, aspect: number): Rect => {
  const h = obj.height * H;
  const w = h * aspect;
  return { left: obj.x * W - w / 2, top: obj.y * H - h, w, h };
};

/** 決まった乱数 (同じ i なら毎フレーム同じ値) */
const hash = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 物の後ろの光 (glow: 白い光と足もとの照り返し / frost: 冷たい光 / steam: 温かい光) */
const Aura: React.FC<{ effect: LayeredObject['effect']; rect: Rect; t: number }> = ({ effect, rect, t }) => {
  if (effect === 'none') {
    return null;
  }
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
  const color = effect === 'frost' ? '120, 200, 255' : effect === 'steam' ? '255, 140, 70' : '232, 246, 255';
  const size = effect === 'glow' ? { w: rect.w * 2.0, h: rect.h * 1.35 } : { w: Math.max(rect.w, rect.h) * 1.35, h: Math.max(rect.w, rect.h) * 1.35 };
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: rect.w / 2 - size.w / 2,
          top: rect.h / 2 - size.h / 2,
          width: size.w,
          height: size.h,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, rgba(${color}, ${effect === 'glow' ? 0.38 : 0.55}), rgba(${color}, 0))`,
          opacity: pulse,
        }}
      />
      {effect === 'glow' ? (
        <div
          style={{
            position: 'absolute',
            left: rect.w / 2 - rect.w * 1.3,
            top: rect.h - rect.h * 0.12,
            width: rect.w * 2.6,
            height: rect.h * 0.3,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(234, 246, 255, 0.45), rgba(234, 246, 255, 0))',
          }}
        />
      ) : null}
    </>
  );
};

/** 冷気の粒。物のまわりをゆっくり回りながら瞬く */
const Frost: React.FC<{ rect: Rect; t: number }> = ({ rect, t }) => {
  const cx = rect.w / 2;
  const cy = rect.h / 2;
  const r = Math.max(rect.w, rect.h) * 0.5;
  return (
    <svg width={rect.w} height={rect.h} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {Array.from({ length: 26 }, (_, i) => {
        const a = hash(i) * Math.PI * 2 + t * (0.25 + hash(i + 50) * 0.2) * (i % 2 === 0 ? 1 : -1);
        const d = r * (0.75 + hash(i + 100) * 0.45);
        const size = 1.5 + hash(i + 150) * 3.5;
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.5 + hash(i + 200)) + i));
        return <circle key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d * 1.05} r={size} fill="#E6F7FF" opacity={twinkle} />;
      })}
    </svg>
  );
};

/** 湯気。物の上からゆらゆら立ちのぼり、上へいくほど薄くなる */
const Steam: React.FC<{ rect: Rect; t: number; id: string }> = ({ rect, t, id }) => {
  const len = rect.h * 0.75;
  const gradId = `steam-${id}`;
  return (
    <svg
      width={rect.w}
      height={len}
      style={{ position: 'absolute', left: 0, top: -len, overflow: 'visible', filter: 'blur(5px)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="0.2" stopColor="#FFFFFF" stopOpacity={0.75} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => {
        const baseX = rect.w * (0.3 + i * 0.2);
        const points: string[] = [];
        for (let yy = 0; yy <= len; yy += 8) {
          const sway = Math.sin(yy / 45 - t * 2.2 + i * 2) * (6 + yy * 0.12);
          points.push(`${baseX + sway},${len - yy}`);
        }
        return (
          <polyline
            key={i}
            points={points.join(' ')}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={14 - i * 3}
            strokeLinecap="round"
            opacity={0.55 + 0.3 * Math.sin(t * 1.5 + i * 1.7)}
          />
        );
      })}
    </svg>
  );
};

/** 物1つ。出方・動き・効果・強調 (focus) */
const ObjectView: React.FC<{ obj: LayeredObject; rect: Rect; order: number }> = ({ obj, rect, order }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const at = ctx.appearAt(obj.id, order);
  if (frame < at) {
    return null;
  }
  const bouncy = obj.enter === 'pop' || obj.enter === 'drop';
  const p = springFrom(frame, at, fps, bouncy ? SPRINGS.bouncy : SPRINGS.snappy);
  const shown = interpolate(p, [0, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = (frame - at) / fps;
  const { focus, dim } = ctx.focusOf(obj.id, frame);

  let enter = '';
  let opacity = shown;
  let blur = 0;
  switch (obj.enter) {
    case 'pop':
      enter = `scale(${0.5 + 0.5 * p})`;
      break;
    case 'drop':
      // 画面の上から落ちてきて、足もとで弾む
      enter = `translateY(${-(1 - p) * (rect.top + rect.h + 80)}px)`;
      opacity = 1;
      break;
    case 'rise':
      enter = `translateY(${(1 - p) * 90}px)`;
      break;
    case 'fade': {
      opacity = interpolate(frame, [at, at + 18], [0, 1], { extrapolateRight: 'clamp' });
      blur = (1 - opacity) * 12;
      break;
    }
  }
  const float = obj.motion === 'float' ? Math.sin(t * Math.PI * 0.8) * 10 : 0;
  const sway = obj.motion === 'sway' ? Math.sin(t * Math.PI * 0.6) * 2 : 0;
  const lift = obj.enter === 'drop' ? Math.min(1, Math.max(0, p)) : shown;
  const grow = Math.min(FOCUS_GROW.ratio, FOCUS_GROW.maxPx / rect.h);

  const filters = [
    blur > 0 ? `blur(${blur}px)` : null,
    focus > 0 ? `drop-shadow(0 0 ${28 * focus}px rgba(255, 236, 190, ${0.9 * focus}))` : null,
    dim > 0 ? `brightness(${1 - 0.35 * dim}) saturate(${1 - 0.5 * dim})` : null,
  ].filter(Boolean);

  return (
    <>
      {obj.shadow ? (
        <div
          style={{
            position: 'absolute',
            left: rect.left + rect.w * 0.08,
            top: rect.top + rect.h - rect.h * 0.045,
            width: rect.w * 0.84,
            height: rect.h * 0.09,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0))',
            opacity: lift * (1 - float / 60),
            transform: `scale(${0.6 + 0.4 * lift - float / 200})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.w,
          height: rect.h,
          transformOrigin: '50% 100%',
          transform: `${enter} translateY(${-float}px) rotate(${sway}deg) scale(${1 + grow * focus})`,
          opacity,
        }}
      >
        <Aura effect={obj.effect} rect={rect} t={t} />
        <Img
          src={resolveSrc(obj.src)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: filters.join(' ') || undefined }}
        />
        {obj.effect === 'frost' ? <Frost rect={rect} t={t} /> : null}
        {obj.effect === 'steam' ? <Steam rect={rect} t={t} id={obj.id} /> : null}
      </div>
    </>
  );
};

/**
 * 注釈の線の起点と箱の位置を、物の位置から決める。
 * 左寄りの物は左下へ・右寄りの物は右下へ・中央の物は横へ箱を出す (下が字幕にかかるときも横へ)。
 */
const calloutPlace = (rect: Rect, nth: number) => {
  const cx = rect.left + rect.w / 2;
  const bottom = rect.top + rect.h;
  const below = bottom + 40 + nth * 120;
  if (cx < W * 0.4 && below <= CALLOUT_MAX_TOP) {
    return { anchor: { x: cx, y: bottom - rect.h * 0.08 }, box: { x: cx - 40, y: below, align: 'right' as const } };
  }
  if (cx > W * 0.6 && below <= CALLOUT_MAX_TOP) {
    return { anchor: { x: cx, y: bottom - rect.h * 0.08 }, box: { x: cx + 40, y: below, align: 'left' as const } };
  }
  const y = Math.min(CALLOUT_MAX_TOP, rect.top + rect.h * 0.3 + nth * 130);
  const toRight = cx <= W * 0.6 && rect.left + rect.w + 50 < W - 380;
  return toRight
    ? { anchor: { x: rect.left + rect.w * 0.8, y: rect.top + rect.h * 0.45 }, box: { x: rect.left + rect.w + 50, y, align: 'left' as const } }
    : { anchor: { x: rect.left + rect.w * 0.2, y: rect.top + rect.h * 0.45 }, box: { x: rect.left - 50, y, align: 'right' as const } };
};

/**
 * 画像生成 AI で作った「背景・物・手前」の画像を重ね、層ごとに違う速さで動かす (視差)。
 * 物は reveal に合わせて弾んで出て、focus で拡大して光る。湯気・冷気・光はコードで足す。
 * 文字 (見出し・注釈・数字) は画像に入れず、ここで重ねる。
 */
export const LayeredLayout: React.FC<{ content: LayeredContent }> = ({ content }) => {
  const frame = useCurrentFrame();
  const ctx = useSceneContext();
  const aspects = useAspects(content.objects.map((obj) => resolveSrc(obj.src)));
  const d = interpolate(frame, [ctx.ts.startFrame, ctx.ts.startFrame + ctx.ts.durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bgMotion = layerMotion(content.camera, DEPTH.background, d);
  const objMotion = layerMotion(content.camera, DEPTH.objects, d);
  const fgMotion = layerMotion(content.camera, DEPTH.foreground, d);
  const rects = aspects ? content.objects.map((obj, i) => rectOf(obj, aspects[i])) : null;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: layerTransform(bgMotion, BLEED.background), transformOrigin: ZOOM_ORIGIN }}>
        <Img
          src={resolveSrc(content.background.src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${content.background.blur ?? 2}px)` }}
        />
      </AbsoluteFill>

      {rects ? (
        <AbsoluteFill style={{ transform: layerTransform(objMotion), transformOrigin: ZOOM_ORIGIN }}>
          {content.objects.map((obj, i) => (
            <ObjectView key={obj.id} obj={obj} rect={rects[i]} order={i} />
          ))}
          {content.callouts.map((callout, i) => {
            const target = content.objects.findIndex((obj) => obj.id === callout.target);
            if (target < 0) {
              return null;
            }
            const nth = content.callouts.slice(0, i).filter((c) => c.target === callout.target).length;
            const place = calloutPlace(rects[target], nth);
            return <Callout key={callout.id} callout={callout} anchor={place.anchor} box={place.box} at={ctx.appearAt(callout.id, 2 + i)} />;
          })}
        </AbsoluteFill>
      ) : null}

      {content.foreground ? (
        <AbsoluteFill style={{ transform: layerTransform(fgMotion, BLEED.foreground), transformOrigin: ZOOM_ORIGIN, pointerEvents: 'none' }}>
          <Img
            src={resolveSrc(content.foreground.src)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${content.foreground.blur ?? 8}px)` }}
          />
        </AbsoluteFill>
      ) : null}

      {content.title ? <TitleOverlay text={content.title} at={ctx.appearAt('title', 1)} /> : null}
      {content.stat ? <StatOverlay stat={content.stat} at={ctx.appearAt('stat', 3)} place={{ align: 'right', x: 1850, y: 110 }} /> : null}
    </AbsoluteFill>
  );
};
