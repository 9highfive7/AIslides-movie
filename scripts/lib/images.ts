/**
 * 台本の layered の画像のうち、prompt (画像生成 AI への指示) があるものの絵を作り、src を埋める。
 * CLI (npm run images) と動画生成アプリ (npm run studio) の両方から使う。
 *
 * 絵は public/generated/ に「指示の内容から決まる名前」で保存し、同じ指示なら作り直さずに使い回す
 * (修正で1つの場面だけ直したとき、ほかの場面の絵はそのまま使える。同じ物を何度出しても絵がそろう)。
 * 画像生成 AI が使えないときや作れなかった絵は src を空のままにし、動画では仮の枠になる。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildImagePrompt, generateImage, resolveImageProvider, type ImageKind, type ImageProvider } from './image-gen';

/** 作った絵を置く場所 (public/ からの相対パス) */
export const GENERATED_DIR = 'generated';

/** 同時に頼む枚数 */
const CONCURRENCY = 3;

interface ImageSlot {
  src?: string;
  prompt?: string;
}

interface ScriptLike {
  meta?: { imageStyle?: string };
  scenes: { id: string; layout: string; content: unknown }[];
}

interface Task {
  kind: ImageKind;
  /** 画像生成 AI へ送るプロンプト */
  prompt: string;
  /** 保存先 (public/ からの相対パス) */
  file: string;
  /** この絵を使う画像の欄 (同じ指示の欄はまとめて1枚) */
  slots: ImageSlot[];
  /** 何の絵か (エラーの表示用) */
  where: string;
}

export interface ImageReport {
  provider: ImageProvider | null;
  /** prompt のある画像の枚数 (同じ指示はまとめて1枚) */
  total: number;
  /** 前に作った絵を使い回した枚数 */
  reused: number;
  /** 今回作った枚数 */
  generated: number;
  /** 絵がなく、仮の枠になる枚数 */
  missing: number;
  /** 作れなかった絵のエラー */
  errors: string[];
}

const fileFor = (kind: ImageKind, prompt: string): string => {
  const key = crypto.createHash('sha256').update(`${kind}\n${prompt}`).digest('hex').slice(0, 16);
  return `${GENERATED_DIR}/${kind}-${key}.${kind === 'background' ? 'jpg' : 'png'}`;
};

/** 台本から、絵を作る欄を集める (同じ指示の欄はまとめる) */
const collectTasks = (script: ScriptLike): Task[] => {
  const style = script.meta?.imageStyle;
  const tasks = new Map<string, Task>();
  const add = (kind: ImageKind, slot: ImageSlot | undefined, where: string) => {
    if (!slot?.prompt) return;
    const prompt = buildImagePrompt(kind, slot.prompt, style);
    const file = fileFor(kind, prompt);
    const task = tasks.get(file) ?? { kind, prompt, file, slots: [], where };
    task.slots.push(slot);
    tasks.set(file, task);
  };
  for (const scene of script.scenes) {
    if (scene.layout !== 'layered') continue;
    const content = scene.content as { background?: ImageSlot; foreground?: ImageSlot; objects?: (ImageSlot & { id?: string })[] };
    add('background', content.background, `${scene.id} の背景`);
    add('foreground', content.foreground, `${scene.id} の手前`);
    for (const obj of content.objects ?? []) add('object', obj, `${scene.id} の物 "${obj.id ?? ''}"`);
  }
  return [...tasks.values()];
};

/** 前に書かれていた src が、まだ使えるか (ファイルがあるか・URL か) */
const usableSrc = (src: string | undefined, publicDir: string): boolean =>
  Boolean(src) && (/^https?:\/\//.test(src as string) || fs.existsSync(path.join(publicDir, src as string)));

/**
 * 台本 (の中身) の layered の絵を作り、src を書き換える。script はその場で書き換える。
 * onProgress は1枚終わるごとに呼ぶ (done / total)。
 */
export const fillImages = async (
  script: ScriptLike,
  publicDir: string,
  onProgress?: (done: number, total: number, message: string) => void,
): Promise<ImageReport> => {
  const provider = resolveImageProvider();
  const tasks = collectTasks(script);
  const report: ImageReport = { provider, total: tasks.length, reused: 0, generated: 0, missing: 0, errors: [] };
  fs.mkdirSync(path.join(publicDir, GENERATED_DIR), { recursive: true });

  const todo = tasks.filter((task) => {
    if (fs.existsSync(path.join(publicDir, task.file))) {
      report.reused++;
      return false;
    }
    return true;
  });
  let done = report.reused;
  onProgress?.(done, tasks.length, report.reused > 0 ? `${report.reused}枚は前に作った絵を使います` : '');

  if (provider) {
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const task = todo[next++];
        try {
          const image = await generateImage(provider, task.kind, task.prompt);
          fs.writeFileSync(path.join(publicDir, task.file), image.data);
          report.generated++;
        } catch (error) {
          report.errors.push(`${task.where}: ${error instanceof Error ? error.message : String(error)}`);
        }
        onProgress?.(++done, tasks.length, task.where);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  }

  for (const task of tasks) {
    const exists = fs.existsSync(path.join(publicDir, task.file));
    if (!exists) report.missing++;
    for (const slot of task.slots) {
      if (exists) {
        slot.src = task.file;
      } else if (!usableSrc(slot.src, publicDir)) {
        // 絵が作れず、前の src も使えない → src を消して仮の枠にする
        delete slot.src;
      }
    }
  }
  return report;
};
