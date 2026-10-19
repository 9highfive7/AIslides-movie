/**
 * 台本 (public/script.json) の layered の画像のうち、prompt (画像生成 AI への指示) があるものの絵を作り、
 * src を書き込む。絵は public/generated/ に保存し、同じ指示なら作り直さない。
 *
 * 使い方:
 *   npm run images
 *
 * 環境変数 (どちらか):
 *   GEMINI_API_KEY (または GOOGLE_API_KEY)  Gemini の画像生成 (既定 gemini-2.5-flash-image)
 *   OPENAI_API_KEY                         OpenAI の画像生成 (既定 gpt-image-1)
 *   IMAGE_PROVIDER=gemini|openai で明示、IMAGE_MODEL でモデルを変更できる
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema } from '../src/schemas';
import { fillImages } from './lib/images';

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

async function main(): Promise<void> {
  const file = path.join(PUBLIC, 'script.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Parameters<typeof fillImages>[0];
  // 形式の確認だけして、書き戻すのは元の JSON (既定値で膨らませない)
  scriptSchema.parse(raw);

  const report = await fillImages(raw, PUBLIC, (done, total, message) => {
    console.log(`  [${done}/${total}] ${message}`);
  });
  if (report.total === 0) {
    console.log('prompt のある画像 (layered の背景・物) がありません。');
    return;
  }
  fs.writeFileSync(file, JSON.stringify(raw, null, 2) + '\n');
  console.log(
    `\n画像: ${report.total}枚 (今回作成 ${report.generated} / 使い回し ${report.reused} / 仮の枠 ${report.missing})` +
      (report.provider ? ` — ${report.provider.provider} / ${report.provider.model}` : ''),
  );
  if (!report.provider && report.missing > 0) {
    console.log('画像生成 AI のキーがないため、絵のない画像は仮の枠で表示されます (GEMINI_API_KEY か OPENAI_API_KEY を設定してください)。');
  }
  for (const error of report.errors) console.error(`  × ${error}`);
  console.log(`→ ${path.relative(ROOT, file)} の src を更新しました。続けて npm run audio → npm run render`);
}

main().catch((error: unknown) => {
  console.error(`\n[generate-images] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
