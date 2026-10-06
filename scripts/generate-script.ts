/**
 * プロンプトまたはURLから台本 (public/script.json) を自動生成する。
 * OpenAI互換のChat Completions APIを利用する。
 *
 * 使い方:
 *   npm run script -- "Remotionの魅力を解説する台本を作って"
 *   npm run script -- --url https://example.com/article
 *
 * 環境変数:
 *   OPENAI_API_KEY   必須
 *   OPENAI_BASE_URL  既定 https://api.openai.com/v1 (Ollamaなど互換エンドポイントも可)
 *   SCRIPT_MODEL     既定 gpt-4o-mini
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema } from '../src/schemas';
import { chatJson, extractJson, resolveLlmConfig } from './lib/llm';
import { fetchPageText } from './lib/fetch-page';

const ROOT = path.resolve(__dirname, '..');

const SYSTEM_PROMPT = `あなたは日本語の解説動画の台本作家です。与えられた資料から、ナレーション付きスライド動画 (1920x1080) の台本をJSONで作成してください。

## 出力形式
{"scenes": [ ... ]} というJSONオブジェクトのみを出力してください。JSON以外の文章は禁止です。

## scenes の各要素に書けるキー
- id: シーンID (英小文字とハイフン)
- layout: レイアウト種別 (下記の6種類)
- label: 左上の英字ラベル (大文字。省略可)
- heading: 見出し (title レイアウトでは不要)
- content: レイアウトごとの中身 (下記)
- lines: ナレーションの配列 (各シーン2〜4セリフ)

lines の各要素: { "text": "読み上げと字幕に使う日本語", "reveal": ["要素ID", ...] }
- text は「です・ます」の話し言葉で、1セリフ1〜2文・40〜100字程度
- reveal には、そのセリフの開始時に出現させる要素のIDを書く
- reveal に書かれない要素はシーン開始から常時表示になる

## layout の6種類と content
1. "title": タイトル画面 (濃紺背景・白文字)。content = { "kicker": "英字(省略可)", "title": "タイトル(改行は\\n)", "subtitle": "補足(省略可)" }。最初のシーンは必ず title。
2. "flow": 横並びのステップ。content = { "steps": [ { "id": "step-1", "icon": "file-text", "title": "短い名前", "body": "補足(省略可)" }, ... ] }。steps は3〜4個。矢印は "arrow-1", "arrow-2", ... というIDで自動的に用意される。
3. "compare": 左右比較。content = { "leftTitle": "…", "rightTitle": "…", "left": [カード...], "right": [カード...] }。カード = { "id": "left-1", "icon": "…", "title": "…", "body": "…(省略可)", "tone": "normal または warning" }。左右それぞれ1〜2枚。
4. "inputOutput": 入力→変換→出力。content = { "input": { "id": "input", "icon": "…", "title": "…", "body": "…" }, "transform": { "id": "transform", "label": "短い説明" }, "output": { "id": "output", "icon": "…", "title": "…", "body": "…" } }。矢印は arrow-1 / arrow-2。
5. "bullets": 縦の箇条書き。content = { "items": [ { "id": "p-1", "icon": "…", "title": "…", "body": "…(省略可)" }, ... ] }。items は2〜4個。
6. "stats": 数字の強調カード。content = { "items": [ { "id": "s-1", "value": "3倍", "label": "短いラベル", "body": "補足(省略可)" }, ... ] }。items は2〜4個。

## ルール
- シーン全体は4〜7個。1画面の情報量は絞る
- icon に使えるキー: file-text, mic, clock, clapperboard, alert-triangle, refresh-cw, check-circle, braces, film, book-open, graduation-cap, settings, play, download, upload, list, lightbulb
- 要素の id はシーン内で重複しない。reveal に書くIDは必ずそのシーンの content に存在する
- 絵文字は使わない。装飾的な表現を避け、簡潔で具体的に書く
- 最後のシーンは視聴者への呼びかけで締める`;

interface IssueLike {
  path: PropertyKey[];
  message: string;
}

const formatIssues = (issues: IssueLike[]): string =>
  issues.map((issue) => `- ${issue.path.join('.') || '(ルート)'}: ${issue.message}`).join('\n');

const parseArgs = (args: string[]): { url?: string; prompt?: string } => {
  let url: string | undefined;
  let prompt: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') {
      url = args[i + 1];
      i++;
    } else {
      prompt = args[i];
    }
  }
  return { url, prompt };
};

async function main(): Promise<void> {
  const { url, prompt } = parseArgs(process.argv.slice(2));
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

  const validate = (value: unknown) => scriptSchema.safeParse(value);
  let result = validate(extractJson(await chatJson(cfg, SYSTEM_PROMPT, material)));
  if (!result.success) {
    console.log('出力の形式にエラーがあったため、修正を依頼します ...');
    const repair = `${material}\n\n-----\n前回の出力には次の形式エラーがありました。エラーをすべて修正した完全なJSONを再度出力してください。\n${formatIssues(result.error.issues)}`;
    result = validate(extractJson(await chatJson(cfg, SYSTEM_PROMPT, repair)));
  }
  if (!result.success) {
    throw new Error(
      `生成された台本の形式が不正です (2回試行しました):\n${formatIssues(result.error.issues)}`,
    );
  }

  const outPath = path.join(ROOT, 'public', 'script.json');
  fs.writeFileSync(outPath, JSON.stringify(result.data, null, 2) + '\n');

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
