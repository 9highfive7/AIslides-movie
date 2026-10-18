/**
 * プロンプトまたはURLから台本 (public/script.json) を自動生成する。
 * 台本は AI が書く (Claude または OpenAI 互換 API。選び方は scripts/lib/script-writer.ts)。
 *
 * 使い方:
 *   npm run script -- "Remotionの魅力を解説する台本を作って"
 *   npm run script -- --url https://example.com/article
 *   npm run script -- --theme pop "…"   (配色テーマも同時に指定)
 *
 * 既存の public/script.json の meta (テーマ・BGM・アバターなどの見た目の設定) は引き継ぐ。
 *
 * 環境変数 (どちらか):
 *   ANTHROPIC_API_KEY  Claude を使う (モデルは CLAUDE_MODEL、既定 claude-opus-5-5)
 *   OPENAI_API_KEY     OpenAI 互換 API を使う (OPENAI_BASE_URL・SCRIPT_MODEL も指定可)
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema, themeNameSchema } from '../src/schemas';
import { scriptProvider, writeScript } from './lib/script-writer';
import { fetchPageText } from './lib/fetch-page';

const ROOT = path.resolve(__dirname, '..');

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

  const { model } = scriptProvider();
  console.log(`台本を生成中 (model: ${model}) ...`);
  const result = { data: await writeScript(material, (m) => console.log(`${m} ...`)) };

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
