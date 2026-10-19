import { stripMarkup } from '../../shared/markup';
import type { Scene, ScriptConfig, Timeline } from '../../src/schemas';

/** YouTube ショートの上限 [秒] (縦か正方形の動画は3分まで) */
export const SHORTS_MAX_SEC = 180;

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

/** 概要欄に足すもの (台本の外から決まる情報) */
export interface DescriptionExtras {
  /** クレジット表記 (例: "VOICEVOX:ずんだもん")。音声合成ソフトの利用規約で求められる */
  credits?: string[];
}

/** ハッシュタグの形にそろえる (# を付け、空白を取る) */
const hashtag = (tag: string): string => `#${tag.replace(/^#+/, '').replace(/\s+/g, '')}`;

/** 縦の動画 (YouTube ショート) の台本か */
export const isShorts = (script: ScriptConfig): boolean => script.meta.format === 'vertical';

/** ショートの目印のハッシュタグ (YouTube はショートを縦の形と長さで見分けるが、付けておくと検索・おすすめで見つかりやすい) */
const SHORTS_TAG = '#Shorts';

/** 台本のハッシュタグ。ショートでは先頭を #Shorts にする (重ならないように) */
const hashtagsOf = (script: ScriptConfig): string[] => {
  const tags = (script.meta.youtube?.hashtags ?? []).map(hashtag).filter((t) => t.length > 1);
  if (!isShorts(script)) return tags;
  return [SHORTS_TAG, ...tags.filter((t) => t.toLowerCase() !== SHORTS_TAG.toLowerCase())];
};

/**
 * 概要欄。動画の説明 → 目次 (チャプター) → 出典 → クレジット → ハッシュタグ の順。
 * 台本に meta.youtube がなければ、タイトル・目次・クレジットだけにする。
 * ショート (縦の動画) には目次 (チャプター) がないので書かず、ハッシュタグの先頭を #Shorts にする
 */
export const buildDescription = (script: ScriptConfig, chapters: Chapter[], extras: DescriptionExtras = {}): string => {
  const yt = script.meta.youtube;
  const sources = yt?.sources ?? [];
  const credits = extras.credits ?? [];
  const tags = hashtagsOf(script);
  const toc = isShorts(script) ? [] : ['', '■ 目次', ...chapters.map((c) => `${formatTimestamp(c.startSec)} ${c.label}`)];
  return [
    yt?.summary ? yt.summary.trim() : videoTitle(script),
    ...toc,
    ...(sources.length > 0 ? ['', '■ 出典・参考', ...sources.map((src) => `・${src.label}${src.url ? ` ${src.url}` : ''}`)] : []),
    ...(credits.length > 0 ? ['', '■ クレジット', ...credits] : []),
    ...(tags.length > 0 ? ['', tags.slice(0, 15).join(' ')] : []),
    '',
  ].join('\n');
};

/** YouTube のタグ欄の上限 (カンマ区切りの合計文字数) */
const TAGS_MAX_CHARS = 500;

/** タグ欄に貼る文字列 (カンマ区切り。重複を除き、上限を超える分は落とす)。ショートでは先頭に Shorts を足す */
export const buildTags = (script: ScriptConfig): string => {
  const out: string[] = [];
  let length = 0;
  for (const raw of [...(isShorts(script) ? ['Shorts'] : []), ...(script.meta.youtube?.tags ?? [])]) {
    const tag = raw.replace(/[<>,]/g, '').trim();
    if (!tag || out.includes(tag)) continue;
    const add = (out.length > 0 ? 1 : 0) + tag.length;
    if (length + add > TAGS_MAX_CHARS) break;
    out.push(tag);
    length += add;
  }
  return out.join(',');
};

/** YouTube のタイトルの上限 [字] */
const TITLE_MAX = 100;

/**
 * タイトルの候補 (YouTube の上限は100字)。台本のタイトルを先頭に、候補を後ろに並べる。
 * ショートでは末尾に #Shorts を付ける (付けても100字に収まるように、本文の方を削る)
 */
export const titleCandidates = (script: ScriptConfig): string[] => {
  const suffix = isShorts(script) ? ` ${SHORTS_TAG}` : '';
  return [...new Set([videoTitle(script), ...(script.meta.youtube?.titles ?? [])].map((t) => t.trim()).filter(Boolean))].map((t) => {
    const body = suffix && t.toLowerCase().includes(SHORTS_TAG.toLowerCase()) ? t : `${[...t].slice(0, TITLE_MAX - suffix.length).join('')}${suffix}`;
    return [...body].slice(0, TITLE_MAX).join('');
  });
};

/** 投稿シート。YouTube Studio の入力欄の順に、貼る内容と投稿前に確かめることをまとめる */
export const buildUploadSheet = (script: ScriptConfig, extras: { durationSec: number; mockAudio: boolean; mockImages: boolean }): string => {
  const tags = buildTags(script);
  const warn = (cond: boolean, text: string) => (cond ? [`  ⚠ ${text}`] : []);
  const shorts = isShorts(script);
  return [
    shorts ? '==== YouTube 投稿シート (ショート) ====' : '==== YouTube 投稿シート ====',
    '',
    '【タイトル】(どれか1つを選ぶ。100字まで)',
    ...titleCandidates(script).map((t, i) => `  ${i + 1}. ${t}`),
    '',
    shorts
      ? '【説明】description.txt の中身をそのまま貼る (ショートには目次 (チャプター) がないので、目次は入れていません)'
      : '【説明】description.txt の中身をそのまま貼る (目次の時刻がチャプターになります)',
    '',
    ...(shorts
      ? [
          '【カバー】thumbnail.png (縦 1080×1920)',
          '  ショートのカバーは、投稿の画面で動画の中の1コマを選ぶか、アプリで画像を指定します',
          '  (画像を指定できないときは、1コマ目に近い場面を選ぶ。冒頭の画面で何の動画かわかるようにしてあります)',
          '',
          '【ショートとして公開されるか】',
          '  ・縦 1080×1920 で、3分以内の動画は自動でショートになります (タイトル・説明の #Shorts は目印)',
          '  ・著作権の申し立て (Content ID) がある音楽を使った1分を超えるショートは、ブロックされることがあります',
        ]
      : ['【サムネイル】thumbnail.png (1280×720)']),
    '',
    '【タグ】(「もっと見る」→「タグ」に貼る)',
    `  ${tags || '(なし)'}`,
    '',
    '【字幕】「字幕」→「ファイルをアップロード」→「タイミングあり」で captions.srt を選ぶ',
    '',
    '【そのほかの設定】',
    '  ・視聴者: 子ども向けに作った動画は「子ども向け」、それ以外は「子ども向けではない」',
    '  ・カテゴリ: 教育 / 動画の言語・字幕の言語: 日本語',
    '  ・改変または合成されたコンテンツ: 実在の人物・場所・出来事を本物そっくりに見せていなければ「いいえ」',
    '    (イラスト・図解・合成音声のナレーションだけなら申告は不要。写実的な AI 映像を使ったときは「はい」)',
    '',
    '【投稿前の確認】',
    `  ・長さ ${formatTimestamp(extras.durationSec)}`,
    ...warn(shorts && extras.durationSec > SHORTS_MAX_SEC, `${SHORTS_MAX_SEC / 60}分を超えているので、ショートではなくふつうの動画になります。台本を短くしてください`),
    ...(shorts && extras.durationSec > 60 && extras.durationSec <= SHORTS_MAX_SEC
      ? ['  ・1分を超えるショートです。最後まで見られる割合が下がりやすいので、短くできないか確かめる']
      : []),
    ...warn(extras.mockAudio, 'ナレーションが無音の仮音声です。VOICEVOX を起動して作り直してください'),
    ...warn(extras.mockImages, '絵がまだない場面 (仮の枠) があります'),
    '  ・数字と出典が正しいか (AI はもっともらしく間違えることがあります)',
    '  ・画像生成 AI の絵が説明として正しいか、不自然な所がないか',
    '  ・まずは「限定公開」で上げ、YouTube 上での見え方を確かめてから公開する',
    '',
  ].join('\n');
};
