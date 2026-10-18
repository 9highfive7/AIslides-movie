import type { ZodType } from 'zod';
import scriptJson from '../public/script.json';
import timelineJson from '../public/timeline.json';
import {
  scriptSchema,
  timelineSchema,
  type Scene,
  type SceneLayout,
  type ScriptConfig,
  type Timeline,
  type TransitionType,
} from './schemas';
import { lintScript } from './elements';

const parse = <T,>(value: unknown, schema: ZodType<T>, file: string): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `- ${issue.path.join('.') || '(ルート)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`${file} の形式が不正です:\n${detail}`);
  }
  return result.data;
};

export const script: ScriptConfig = parse(scriptJson, scriptSchema, 'public/script.json');
export const timeline: Timeline = parse(timelineJson, timelineSchema, 'public/timeline.json');

for (const issue of lintScript(script)) {
  console.warn(`[script.json] ${issue}`);
}

// script.json と timeline.json の整合性チェック。
// 台本を編集した後に npm run audio を実行していない場合に、ここで明確なエラーになる。
const scenesById = new Map(script.scenes.map((scene) => [scene.id, scene]));
for (const scene of script.scenes) {
  if (!timeline.scenes.some((ts) => ts.id === scene.id)) {
    throw new Error(
      `script.json にシーン "${scene.id}" がありますが、timeline.json に対応するエントリがありません。\n` +
        '台本を変更した場合は npm run audio を再実行してください。',
    );
  }
}

export const sceneOf = (sceneId: string): Scene => {
  const scene = scenesById.get(sceneId);
  if (!scene) {
    throw new Error(
      `timeline.json にシーン "${sceneId}" がありますが、script.json に対応するシーンがありません。\n` +
        '台本を変更した場合は npm run audio を再実行してください。',
    );
  }
  return scene;
};

/** 濃い背景で描くレイアウト (見出しなし・全面デザイン) */
export const isDarkLayout = (layout: SceneLayout): boolean =>
  layout === 'title' || layout === 'section' || layout === 'outro';

/** シーンに入るときのトランジション (シーン指定 → meta 既定の順) */
export const transitionOf = (scene: Scene): TransitionType => scene.transition ?? script.meta.transition;
