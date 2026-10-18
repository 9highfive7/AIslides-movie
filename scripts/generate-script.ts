/**
 * プロンプトまたはURLから台本 (public/script.json) を自動生成する。
 * OpenAI互換のChat Completions APIを利用する。
 *
 * 使い方:
 *   npm run script -- "Remotionの魅力を解説する台本を作って"
 *   npm run script -- --url https://example.com/article
 *   npm run script -- --theme pop "…"   (配色テーマも同時に指定)
 *
 * 既存の public/script.json の meta (テーマ・BGM・アバターなどの見た目の設定) は引き継ぐ。
 *
 * 環境変数:
 *   OPENAI_API_KEY   必須
 *   OPENAI_BASE_URL  既定 https://api.openai.com/v1 (Ollamaなど互換エンドポイントも可)
 *   SCRIPT_MODEL     既定 gpt-4o-mini
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema, themeNameSchema, type ScriptConfig } from '../src/schemas';
import { lintScript } from '../src/elements';
import { ICON_NAMES } from '../src/components/IconBox';
import { chatJson, extractJson, resolveLlmConfig } from './lib/llm';
import { fetchPageText } from './lib/fetch-page';

const ROOT = path.resolve(__dirname, '..');

const buildSystemPrompt = (): string => `あなたは日本語の YouTube 解説動画の台本作家です。与えられた資料から、ナレーション付きスライド動画 (1920x1080) の台本をJSONで作成してください。
視聴者が最後まで見たくなるよう、冒頭で結論や問いを示し、テンポよく画面を切り替えてください。

## 出力形式
{"meta": {...}, "scenes": [ ... ]} というJSONオブジェクトのみを出力してください。JSON以外の文章は禁止です。

## meta に書けるキー
- title: YouTube の動画タイトル (32字以内。数字や具体的な言葉で興味を引く)
- thumbnail: { "text": "サムネイルの大きな文字 (2行まで。改行は\\n、強調語は **で囲む**)", "sub": "補足 (省略可)", "badge": "左上の短いラベル (省略可)" }
- subscribePopup: { "sceneId": "チャンネル登録を促すポップアップを出すシーンID (動画の中盤の section シーン)" }

## scenes の各要素に書けるキー
- id: シーンID (英小文字とハイフン)
- layout: レイアウト種別 (下記)
- label: 左上の英字ラベル (大文字。省略可)
- heading: 見出し (title / section / outro では不要)
- chapter: 左下の章タグ (例: "02 仕組み"。省略可)
- lines: ナレーションの配列 (各シーン1〜4セリフ)

lines の各要素: { "text": "読み上げと字幕に使う日本語", "reveal": ["要素ID", ...], "focus": ["要素ID", ...] }
- text は「です・ます」の話し言葉で、1セリフ1〜2文・30〜90字程度
- 一番伝えたい語句は **で囲む** と字幕で色が変わる (1セリフに1か所まで。読み上げには影響しない)
- reveal: そのセリフの開始時に出現させる要素のID。書かれない要素はシーン開始から表示される
- focus: そのセリフの間だけ拡大して強調する要素のID (他の要素は薄くなる)。説明している要素を指すのに使う (省略可)

## layout と content
1. "title": 動画の最初のタイトル画面。content = { "kicker": "英字(省略可)", "title": "タイトル(改行は\\n、**強調**可)", "subtitle": "補足(省略可)" }。最初のシーンは必ず title。
2. "section": 章扉。content = { "number": "01", "title": "章タイトル", "subtitle": "補足(省略可)" }。5シーン以上の動画では章ごとに入れる。
3. "flow": 横並びのステップ。content = { "steps": [ { "id": "step-1", "icon": "…", "title": "短い名前", "body": "補足(省略可)" }, ... ] }。steps は3〜4個。矢印は "arrow-1", "arrow-2", ... というIDで自動的に用意される。
4. "compare": 左右比較 (中央に VS が出る)。content = { "leftTitle": "…", "rightTitle": "…", "left": [カード...], "right": [カード...] }。カード = { "id": "left-1", "icon": "…", "title": "…", "body": "…(省略可)", "tone": "normal または warning" }。左右それぞれ1〜2枚。
5. "inputOutput": 入力→変換→出力。content = { "input": { "id": "input", "icon": "…", "title": "…", "body": "…" }, "transform": { "id": "transform", "label": "短い説明" }, "output": { "id": "output", "icon": "…", "title": "…", "body": "…" } }。矢印は arrow-1 / arrow-2。
6. "bullets": 縦の箇条書き。content = { "items": [ { "id": "p-1", "icon": "…", "title": "…", "body": "…(省略可)" }, ... ] }。items は2〜4個。
7. "stats": 数字の強調カード (数字がカウントアップする)。content = { "items": [ { "id": "s-1", "value": "3倍", "label": "短いラベル", "body": "補足(省略可)" }, ... ] }。items は2〜4個。
8. "statement": 一文を大きく見せるキメの画面。content = { "text": "20字程度の一文 (**強調**にマーカーが引かれる。改行は\\n)", "sub": "補足(省略可)", "icon": "…(省略可)" }。要素IDは "text" と "sub"。結論や驚きの事実に使う。
9. "ranking": ランキング。content = { "items": [ { "id": "r-1", "title": "…", "body": "…(省略可)", "icon": "…(省略可)" }, ... ] }。items は1位から順に3〜5個。下位から順に reveal すると盛り上がる。
10. "checklist": 番号付きチェックリスト。content = { "items": [ { "id": "c-1", "text": "…", "note": "…(省略可)" }, ... ] }。items は2〜4個。
11. "share": 1本の帯を区切って割合 (シェア) を見せるグラフ。content = { "title": "グラフの題(省略可)", "segments": [ { "id": "sh-1", "display": "約5割", "label": "日本製(省略可)", "value": 50, "tone": "warning / accent / muted" }, ... ], "source": "出典(省略可)" }。segments は1〜3個。区分は reveal したときに左から伸びる。
12. "scene3d": 3D の場面 (three.js)。content = { "preset": "…", "title": "上部の一文(省略可・**強調**可)", "stat": { "kicker": "…", "value": "190億個", "note": "出典" }(省略可), "callouts": [ { "id": "…", "title": "…", "sub": "…", "tone": "accent / warning / muted / normal" } ](省略可) }。preset と要素ID: "phoneChip" (スマホの箱が開きチップへ寄る。open / label / zoom、content.label = { title, sub }) / "vendingCount" (自販機1台 → 大量の自販機。machine / many) / "vendingHotCold" (自販機の左右に冷たさと熱の玉。machine / cold / heat、callouts は 冷たさ・熱 の順に2つ) / "vendingCutaway" (扉が開き管の中を熱が流れる。open / flow、callouts は 吸熱・圧縮・放熱・膨張 の順に4つ) / "heatReuse" (冷蔵庫は熱を捨て、自販機は回す。left / right、callouts は 捨てる熱・回す熱 の2つ) / "vendingEnergy" (自販機→稲妻→家とカレンダー。machine / bolt / house / months、callouts は カレンダーに1つ)。title / stat / 各 callout の id も reveal に書ける。題材に合う preset がなければ使わない。
13. "outro": 最後のお礼と登録のお願い。content = { "title": "ご視聴ありがとうございました", "message": "次回予告など(省略可)" }。最後のシーンは必ず outro。

## ルール
- シーン全体は5〜10個。1画面の情報量は絞る。同じレイアウトを3回以上連続させない
- icon に使えるキー: ${ICON_NAMES.join(', ')}
- 要素の id はシーン内で重複しない。reveal / focus に書くIDは必ずそのシーンの content に存在する
- 絵文字は使わない。装飾的な表現を避け、簡潔で具体的に書く
- outro では高評価とチャンネル登録を自然に呼びかける`;

interface IssueLike {
  path: PropertyKey[];
  message: string;
}

const formatIssues = (issues: IssueLike[]): string =>
  issues.map((issue) => `- ${issue.path.join('.') || '(ルート)'}: ${issue.message}`).join('\n');

const parseArgs = (args: string[]): { url?: string; prompt?: string; theme?: string } => {
  let url: string | undefined;
  let prompt: string | undefined;
  let theme: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') {
      url = args[i + 1];
      i++;
    } else if (args[i] === '--theme') {
      theme = args[i + 1];
      i++;
    } else {
      prompt = args[i];
    }
  }
  return { url, prompt, theme };
};

/** 既存の台本の meta (検証に通るものだけ)。なければ空 */
const readPreviousMeta = (file: string): Record<string, unknown> => {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { meta?: unknown };
    if (raw.meta && typeof raw.meta === 'object' && scriptSchema.shape.meta.safeParse(raw.meta).success) {
      const { title: _t, thumbnail: _th, subscribePopup: _sp, ...visual } = raw.meta as Record<string, unknown>;
      return visual;
    }
  } catch {
    // 台本がない・壊れている場合は既定値で作る
  }
  return {};
};

async function main(): Promise<void> {
  const { url, prompt, theme } = parseArgs(process.argv.slice(2));
  const themeName = theme === undefined ? undefined : themeNameSchema.parse(theme);
  if (url === undefined && prompt === undefined) {
    throw new Error(
      '使い方: npm run script -- "プロンプト" または npm run script -- --url https://example.com/page',
    );
  }
  if (url !== undefined && prompt !== undefined) {
    throw new Error('--url とプロンプトは同時に指定できません。');
  }

  let material: string;
  if (url !== undefined) {
    console.log(`ページを取得中: ${url}`);
    const page = await fetchPageText(url);
    console.log(`  タイトル: ${page.title || '(なし)'} / 本文 ${page.text.length}字`);
    material = `次のウェブページの本文から台本を作成します。\nURL: ${page.url}\nページタイトル: ${page.title}\n-----\n${page.text}\n-----`;
  } else {
    material = `次の依頼内容から台本を作成します。\n-----\n${prompt}\n-----`;
  }

  const cfg = resolveLlmConfig();
  console.log(`台本を生成中 (model: ${cfg.model}) ...`);

  const systemPrompt = buildSystemPrompt();

  /** スキーマ検証 + 要素IDの整合性チェック。問題があればメッセージの配列を返す */
  const validate = (value: unknown): { data?: ScriptConfig; problems: string[] } => {
    const parsed = scriptSchema.safeParse(value);
    if (!parsed.success) {
      return { problems: [formatIssues(parsed.error.issues)] };
    }
    const lint = lintScript(parsed.data);
    return lint.length > 0 ? { problems: lint.map((m) => `- ${m}`) } : { data: parsed.data, problems: [] };
  };

  let result = validate(extractJson(await chatJson(cfg, systemPrompt, material)));
  if (!result.data) {
    console.log('出力にエラーがあったため、修正を依頼します ...');
    const repair = `${material}\n\n-----\n前回の出力には次のエラーがありました。エラーをすべて修正した完全なJSONを再度出力してください。\n${result.problems.join('\n')}`;
    result = validate(extractJson(await chatJson(cfg, systemPrompt, repair)));
  }
  if (!result.data) {
    throw new Error(`生成された台本の形式が不正です (2回試行しました):\n${result.problems.join('\n')}`);
  }

  const outPath = path.join(ROOT, 'public', 'script.json');
  // 見た目の設定 (テーマ・BGM・アバター等) は既存の台本から引き継ぎ、内容に関わる項目だけ差し替える
  const previous = readPreviousMeta(outPath);
  const generated = result.data.meta;
  const meta = {
    ...previous,
    ...(themeName ? { theme: themeName } : null),
    ...(generated.title ? { title: generated.title } : null),
    ...(generated.thumbnail ? { thumbnail: { ...generated.thumbnail, image: undefined } } : null),
    subscribePopup: generated.subscribePopup,
  };
  const output = { meta, scenes: result.data.scenes };
  // 書き出す前にもう一度検証 (引き継いだ meta と組み合わせても正しいか)
  scriptSchema.parse(output);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

  const scenes = result.data.scenes;
  const lineCount = scenes.reduce((n, s) => n + s.lines.length, 0);
  console.log(
    `\n台本を書き出しました: ${outPath}\n` +
      `${scenes.length}シーン / ${lineCount}セリフ\n\n` +
      '内容を確認・手直ししてから、次のコマンドで動画化できます:\n' +
      '  npm run audio        (音声生成 + タイムライン作成)\n' +
      '  npm run dev          (プレビュー)\n' +
      '  npm run render       (MP4書き出し)',
  );
}

main().catch((error: unknown) => {
  console.error(`\n[generate-script] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
