import { TRANSITION_HALF_FRAMES } from '../shared/timing';
import { script, sceneOf, timeline, transitionOf } from './data';
import type { SfxName } from './schemas';

export type SfxFile = Exclude<SfxName, 'none'>;

export interface SfxEvent {
  name: SfxFile;
  frame: number;
}

/** 各効果音の基準音量 (meta.sfx.volume が掛かる) */
export const SFX_GAIN: Record<SfxFile, number> = {
  pop: 0.55,
  whoosh: 0.4,
  ding: 0.5,
  click: 0.7,
};

/** 登録ボタンのクリック演出で、クリックが起きる (アニメ開始からの) フレーム */
export const SUBSCRIBE_CLICK_OFFSET = 34;
/** 登録ポップアップがシーン開始から何フレーム後に出るか */
export const SUBSCRIBE_POPUP_DELAY = 10;
/** 登録ポップアップの表示時間 [フレーム] */
export const SUBSCRIBE_POPUP_FRAMES = 130;
/** outro シーンで登録ボタンの演出が始まるまでの遅れ [フレーム] */
export const OUTRO_SUBSCRIBE_DELAY = 30;

/** 台本と timeline から、効果音を鳴らすタイミングを全部集める */
export const collectSfxEvents = (): SfxEvent[] => {
  const { sfx, subscribePopup } = script.meta;
  if (!sfx.enabled) {
    return [];
  }
  const events: SfxEvent[] = [];

  timeline.scenes.forEach((ts, i) => {
    const scene = sceneOf(ts.id);
    const transition = transitionOf(scene);
    if (i > 0 && sfx.transition && transition !== 'none') {
      events.push({ name: 'whoosh', frame: Math.max(0, ts.startFrame - TRANSITION_HALF_FRAMES - 2) });
    }
    for (const line of ts.lines) {
      const name: SfxName = line.sfx ?? (sfx.reveal && line.reveal.length > 0 ? 'pop' : 'none');
      if (name !== 'none') {
        events.push({ name, frame: line.startFrame });
      }
    }
    if (scene.layout === 'outro' && scene.content.subscribe) {
      events.push({ name: 'click', frame: ts.startFrame + OUTRO_SUBSCRIBE_DELAY + SUBSCRIBE_CLICK_OFFSET });
    }
    if (subscribePopup?.sceneId === scene.id) {
      events.push({
        name: 'click',
        frame: ts.startFrame + SUBSCRIBE_POPUP_DELAY + SUBSCRIBE_CLICK_OFFSET,
      });
    }
  });

  return events;
};

/** ナレーションが鳴っているかどうか (0〜1、前後をなめらかに) — BGM の自動音量調整用 */
export const narrationWeight = (frame: number, ramp = 8): number => {
  let weight = 0;
  for (const ts of timeline.scenes) {
    if (frame < ts.startFrame - ramp || frame > ts.startFrame + ts.durationFrames + ramp) {
      continue;
    }
    for (const line of ts.lines) {
      const start = line.startFrame;
      const end = line.startFrame + line.durationFrames;
      if (frame >= start - ramp && frame <= end + ramp) {
        const w = Math.min(1, (frame - (start - ramp)) / ramp, (end + ramp - frame) / ramp);
        weight = Math.max(weight, w);
      }
    }
  }
  return weight;
};
