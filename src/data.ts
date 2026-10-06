import { z, type ZodType } from 'zod';
import scriptJson from '../public/script.json';
import timelineJson from '../public/timeline.json';
import {
  scriptSchema,
  timelineSchema,
  type ScriptConfig,
  type Timeline,
} from './schemas';

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

// script.json と timeline.json の整合性チェック。
// 台本を編集した後に npm run audio を実行していない場合に、ここで明確なエラーになる。
for (const scene of script.scenes) {
  if (!timeline.scenes.some((ts) => ts.id === scene.id)) {
    throw new Error(
      `script.json にシーン "${scene.id}" がありますが、timeline.json に対応するエントリがありません。\n` +
        '台本を変更した場合は npm run audio を再実行してください。',
    );
  }
}
