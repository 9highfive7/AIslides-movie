import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useSceneContext } from '../context/SceneContext';
import { revealStyle, springForPreset, springFrom } from '../animation/presets';
import { useTheme } from '../themes';
import type { RevealPreset } from '../schemas';

/** シーン・meta 指定のプリセットを優先し、'auto' ならレイアウトの既定を使う */
export const useResolvedPreset = (layoutDefault: Exclude<RevealPreset, 'auto'>) => {
  const { preset } = useSceneContext();
  return preset === 'auto' ? layoutDefault : preset;
};

/** 要素の出現フレームとバネの進み具合 (0 → 1) */
export const useAppear = (
  id: string | null,
  order = 0,
  layoutDefault: Exclude<RevealPreset, 'auto'> = 'fadeUp',
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctx = useSceneContext();
  const preset = useResolvedPreset(layoutDefault);
  const at = ctx.appearAt(id, order);
  const progress = springFrom(frame, at, fps, springForPreset(preset));
  return { frame, fps, at, preset, progress };
};

/**
 * 要素の出現アニメーション + フォーカス (強調) 表示。
 * - id が台本の reveal に書かれていれば、そのセリフの開始時に出現する
 * - 書かれていなければ、シーン冒頭に order 番目として順に出現する
 * - セリフの focus に書かれていれば拡大＋枠で強調、他の要素は薄くなる
 */
export const Reveal: React.FC<{
  id: string | null;
  order?: number;
  /** レイアウトのおすすめ (台本で animation 指定があればそちらが優先) */
  preset?: Exclude<RevealPreset, 'auto'>;
  /** フォーカス時の枠を出すか (カード以外の矢印などは false) */
  focusRing?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ id, order = 0, preset: layoutDefault = 'fadeUp', focusRing = true, children, style }) => {
  const theme = useTheme();
  const ctx = useSceneContext();
  const { frame, preset, progress } = useAppear(id, order, layoutDefault);
  const { focus, dim } = id === null ? { focus: 0, dim: 0 } : ctx.focusOf(id, frame);

  const appear = revealStyle(preset, progress);
  const focusTransform = focus > 0 ? ` scale(${1 + 0.035 * focus})` : '';

  return (
    <div
      style={{
        position: 'relative',
        ...style,
        ...appear,
        transform: `${appear.transform ?? ''}${focusTransform}` || undefined,
        opacity: Number(appear.opacity ?? 1) * (1 - 0.6 * dim),
        filter:
          [appear.filter, dim > 0 ? `saturate(${1 - 0.7 * dim})` : null].filter(Boolean).join(' ') ||
          undefined,
        zIndex: focus > 0 ? 2 : undefined,
      }}
    >
      {children}
      {focusRing && focus > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: theme.radius + 6,
            border: `3px solid ${theme.colors.accent}`,
            boxShadow: `0 0 0 6px ${theme.colors.accentSoft}`,
            opacity: focus,
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </div>
  );
};
