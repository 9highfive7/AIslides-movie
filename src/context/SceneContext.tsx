import { createContext, useContext } from 'react';
import { interpolate } from 'remotion';
import { FOCUS_FADE_FRAMES } from '../themes';
import type { Meta, RevealPreset, Scene, TimelineScene } from '../schemas';

/** 同じセリフで複数の要素を出すときの、要素間の時間差 [フレーム] */
const REVEAL_STAGGER_FRAMES = 5;
/** reveal 指定のない要素がシーン冒頭で順に出てくるときの時間差 [フレーム] */
const ENTRANCE_STAGGER_FRAMES = 4;

export interface SceneContextValue {
  scene: Scene;
  ts: TimelineScene;
  /** シーンで使う出現アニメーション ('auto' のときは各レイアウトの既定) */
  preset: RevealPreset;
  /** シーン冒頭の見出しなどが動き始めるフレーム */
  introAt: number;
  /** 要素の出現開始フレーム。reveal 指定がなければ order 番目としてシーン冒頭に出す */
  appearAt: (elementId: string | null, order?: number) => number;
  /** reveal に書かれているかどうか */
  isRevealed: (elementId: string) => boolean;
  /** frame 時点での強調度 (focus: 0〜1) と、他要素の強調による減光度 (dim: 0〜1) */
  focusOf: (elementId: string, frame: number) => { focus: number; dim: number };
}

interface FocusWindow {
  ids: string[];
  start: number;
  end: number;
}

export const buildSceneContext = (scene: Scene, ts: TimelineScene, meta: Meta): SceneContextValue => {
  const revealFrames = new Map<string, number>();
  for (const line of ts.lines) {
    line.reveal.forEach((id, i) => {
      if (!revealFrames.has(id)) {
        revealFrames.set(id, line.startFrame + i * REVEAL_STAGGER_FRAMES);
      }
    });
  }

  const sceneEnd = ts.startFrame + ts.durationFrames;
  const windows: FocusWindow[] = ts.lines
    .map((line, i) => ({
      ids: line.focus,
      start: line.startFrame,
      end: ts.lines[i + 1]?.startFrame ?? sceneEnd - FOCUS_FADE_FRAMES,
    }))
    .filter((w) => w.ids.length > 0);

  const weight = (w: FocusWindow, frame: number): number =>
    interpolate(
      frame,
      [w.start, w.start + FOCUS_FADE_FRAMES, w.end - FOCUS_FADE_FRAMES / 2, w.end + FOCUS_FADE_FRAMES / 2],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );

  const introAt = ts.startFrame;

  return {
    scene,
    ts,
    preset: scene.animation ?? meta.animation,
    introAt,
    appearAt: (elementId, order = 0) => {
      const at = elementId === null ? undefined : revealFrames.get(elementId);
      return at ?? introAt + 6 + order * ENTRANCE_STAGGER_FRAMES;
    },
    isRevealed: (elementId) => revealFrames.has(elementId),
    focusOf: (elementId, frame) => {
      let focus = 0;
      let any = 0;
      for (const w of windows) {
        const wt = weight(w, frame);
        if (wt <= 0) {
          continue;
        }
        any = Math.max(any, wt);
        if (w.ids.includes(elementId)) {
          focus = Math.max(focus, wt);
        }
      }
      return { focus, dim: Math.max(0, any - focus) };
    },
  };
};

const SceneContext = createContext<SceneContextValue | null>(null);

export const SceneProvider = SceneContext.Provider;

export const useSceneContext = (): SceneContextValue => {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error('useSceneContext はシーンの内側でのみ使えます');
  }
  return ctx;
};
