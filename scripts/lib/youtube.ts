import { stripMarkup } from '../../shared/markup';
import type { Scene, ScriptConfig, Timeline } from '../../src/schemas';

export interface Chapter {
  startSec: number;
  label: string;
}

/** YouTube の概要欄形式のタイムスタンプ (例: 0:00 / 12:34 / 1:02:03) */
export const formatTimestamp = (sec: number): string => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const chapterLabel = (scene: Scene, index: number): string | null => {
  switch (scene.layout) {
    case 'title':
      return index === 0 ? 'オープニング' : stripMarkup(scene.content.title).replace(/\n/g, ' ');
    case 'section':
      return `${scene.content.number ? `${scene.content.number} ` : ''}${stripMarkup(scene.content.title)}`;
    case 'outro':
      return 'エンディング';
    default:
      return scene.heading ? stripMarkup(scene.heading) : null;
  }
};

/** YouTube のチャプター要件: 先頭が 0:00 / 3つ以上 / 各10秒以上 */
const MIN_CHAPTER_SEC = 10;

/**
 * チャプターを作る。章扉 (section) があればそれを区切りにし、
 * 足りなければ見出し付きシーンを全部使う。10秒未満のチャプターは前に統合する。
 */
export const buildChapters = (script: ScriptConfig, timeline: Timeline): { chapters: Chapter[]; warnings: string[] } => {
  const scenes = timeline.scenes.map((ts, i) => {
    const scene = script.scenes.find((s) => s.id === ts.id);
    if (!scene) {
      throw new Error(`timeline.json のシーン "${ts.id}" が script.json にありません。npm run audio を再実行してください。`);
    }
    return { scene, startSec: ts.startFrame / timeline.fps, index: i };
  });
  const totalSec = timeline.totalFrames / timeline.fps;

  const pick = (useAll: boolean): Chapter[] =>
    scenes
      .filter(({ scene, index }) => index === 0 || scene.layout === 'section' || scene.layout === 'outro' || useAll)
      .map(({ scene, startSec, index }) => ({ startSec: index === 0 ? 0 : startSec, label: chapterLabel(scene, index) }))
      .filter((c): c is Chapter => c.label !== null);

  let chapters = pick(false);
  if (chapters.length < 3) {
    chapters = pick(true);
  }

  const merged: Chapter[] = [];
  for (const chapter of chapters) {
    const prev = merged[merged.length - 1];
    if (prev && chapter.startSec - prev.startSec < MIN_CHAPTER_SEC) {
      continue;
    }
    merged.push(chapter);
  }
  while (merged.length > 1 && totalSec - merged[merged.length - 1].startSec < MIN_CHAPTER_SEC) {
    merged.pop();
  }

  const warnings: string[] = [];
  if (merged.length < 3) {
    warnings.push('チャプターが3つ未満のため、YouTube では目次として認識されません (section シーンを増やしてください)。');
  }
  return { chapters: merged, warnings };
};

const srtTime = (frame: number, fps: number): string => {
  const ms = Math.round((frame / fps) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(rest).padStart(3, '0')}`;
};

/** 字幕ファイル (SRT)。YouTube Studio の「字幕」にアップロードすると自動字幕より正確な字幕になる */
export const buildSrt = (timeline: Timeline): string => {
  const lines = timeline.scenes.flatMap((ts) => ts.lines);
  return lines
    .map((line, i) => {
      const next = lines[i + 1];
      const end = Math.min(line.startFrame + line.durationFrames + 6, next ? next.startFrame : Infinity);
      return `${i + 1}\n${srtTime(line.startFrame, timeline.fps)} --> ${srtTime(end, timeline.fps)}\n${stripMarkup(line.text)}\n`;
    })
    .join('\n');
};

export const videoTitle = (script: ScriptConfig): string => {
  if (script.meta.title) {
    return script.meta.title;
  }
  const title = script.scenes.find((scene) => scene.layout === 'title');
  return title && title.layout === 'title' ? stripMarkup(title.content.title).replace(/\n/g, '') : '';
};

export const buildDescription = (script: ScriptConfig, chapters: Chapter[]): string => {
  const title = videoTitle(script);
  return [
    title,
    '',
    '■ 目次',
    ...chapters.map((c) => `${formatTimestamp(c.startSec)} ${c.label}`),
    '',
  ].join('\n');
};
