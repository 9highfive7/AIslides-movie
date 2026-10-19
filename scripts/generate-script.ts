/**
 * プロンプトまたはURLから台本 (public/script.json) を自動生成する。
 * OpenAI互換のChat Completions APIを利用する。
 *
 * 使い方:
 *   npm run script -- "Remotionの魅力を解説する台本を作って"
 *   npm run script -- --url https://example.com/article
 *   npm run script -- --theme pop "…"          (配色テーマも同時に指定。keep = 既存の台本のまま)
 *   npm run script -- --audience general "…"   (大人向けの解説。既定は kids = 子ども向け)
 *
 * 既定 (--audience kids) では、小学生にもわかる言葉で、3D オブジェクト (scene3d) を中心に
 * 見せる台本を作り、配色は kids テーマにする。
 * 既存の public/script.json の meta (BGM・アバターなどの見た目の設定) は引き継ぐ。
 *
 * 環境変数:
 *   OPENAI_API_KEY   必須
 *   OPENAI_BASE_URL  既定 https://api.openai.com/v1 (Ollamaなど互換エンドポイントも可)
 *   SCRIPT_MODEL     既定 gpt-4o-mini
 */
import fs from 'node:fs';
import path from 'node:path';
import { scriptSchema, themeNameSchema, type ScriptConfig, type ThemeName } from '../src/schemas';
import { lintScript } from '../src/elements';
import { ICON_NAMES } from '../src/components/IconBox';
import { COLOR_NAMES, SHAPES, SHAPE_NAMES } from '../src/three/catalog';
import { chatJson, extractJson, resolveLlmConfig } from './lib/llm';
import { fetchPageText } from './lib/fetch-page';

const ROOT = path.resolve(__dirname, '..');

type Audience = 'kids' | 'general';

const SHAPE_LIST = SHAPE_NAMES.map((name) => `${name}(${SHAPES[name].ja})`).join(', ');

/** 見せ方 (3D オブジェクト) の説明。子ども向け・大人向けで共通 */
const SCENE3D_SPEC = `"scene3d": 3D オブジェクトを舞台に並べて見せる。物が上から落ちてきて弾み、説明中の物はぴょんぴょん跳ねる。content = { "arrangement": "row | flow | cycle", "objects": [ { "id": "o-1", "shape": "形のキー", "label": "名札 (8字以内)", "color": "色名 (省略可)", "count": 数 (省略可。1〜12), "size": 大きさ (省略可。0.5〜2) }, ... ], "caption": "ひとこと (省略可。25字以内)" }。objects は1〜5個。
   - row: 横に並べる (しょうかい・くらべる)。flow: 左から右へ矢印でつなぐ (じゅんばん・原因と結果。矢印のIDは "arrow-1", "arrow-2", ...)。cycle: 輪にして矢印で一周する (くりかえし・じゅんかん。物は2個以上。矢印のIDは "arrow-1"〜"arrow-N")
   - 数は count で見せる (「りんごが3こ」→ shape: "apple", count: 3。1こずつ順に出てくるので数えられる)
   - 大きさの違いは size で見せる (小さい 0.5 / ふつう 1 / 大きい 1.8)
   - 目に見えないもの・むずかしいものも、形のある物にたとえる (データ → letter / お金 → coin / 時間 → clock / ふえる → arrow-up / へる → arrow-down / AI → robot / ひらめき → lightbulb / なぜ？ → question)
   - 要素ID: objects の各 id・矢印 arrow-N・"caption"
   - shape に使えるキー (必ずこの中から選ぶ): ${SHAPE_LIST}
   - color に使える色名: ${Object.keys(COLOR_NAMES).join(', ')}`;

const AUDIENCE_RULES: Record<Audience, { role: string; voice: string; visual: string }> = {
  kids: {
    role: 'あなたは子ども (小学生) 向けの YouTube 解説動画の台本作家です。むずかしいことを、小学3年生でもわかるように、3D オブジェクトを使ってやさしく楽しく説明します。',
    voice: `## ことば (子ども向け)
- 小学3年生がわかる言葉だけを使う。専門用語・カタカナ語・漢語は使わないか、使うときはすぐに「〜のこと」と身近な言葉で言いかえる
- 話しかける口調にする (「〜だよ」「〜なんだ」「〜かな？」「いっしょに見てみよう」)。1セリフ1〜2文・20〜60字
- 漢字は小学校低学年〜中学年で習うものだけにし、それ以外はひらがなで書く。読みまちがえやすい言葉は speech にひらがなで書く
- 身近なたとえ (おやつ・学校・公園・おもちゃ・家族・どうぶつ) で説明する。数や大きさは「りんご3こ分」「ゾウくらい」のように目に見えるものにする
- 「問いかけ → こたえ → りゆう → おさらい」の順にする。冒頭で「〜ってふしぎだよね？」と興味を引き、最後に checklist でおさらいする
- かんたんにしても、まちがったことは言わない。こわがらせる言い方はしない`,
    visual: `## 見せ方 (3D オブジェクトが主役)
- 内容のシーン (title / section / outro 以外) の半分以上を "scene3d" にする。言葉だけで説明せず、物の形・数・大きさ・動き (矢印) で見せる
- title と section の content には "objects" (テーマに合う形のキーを3〜6個) を入れる。画面のまわりに 3D オブジェクトが浮かぶ
- 文字の多いレイアウト (表・グラフ) は使わない。bullets や checklist の文は短く (15字以内) し、icon を付ける`,
  },
  general: {
    role: 'あなたは日本語の YouTube 解説動画の台本作家です。与えられた資料から、ナレーション付きスライド動画の台本を作成します。視聴者が最後まで見たくなるよう、冒頭で結論や問いを示し、テンポよく画面を切り替えてください。',
    voice: `## ことば
- text は「です・ます」の話し言葉で、1セリフ1〜2文・30〜90字程度
- 絵文字は使わない。装飾的な表現を避け、簡潔で具体的に書く`,
    visual: `## 見せ方
- 仕組みや流れ・数の多さ・大きさの比較は、"scene3d" で 3D オブジェクトにして見せるとわかりやすい (2〜3シーンに1回くらい)
- title と section の content に "objects" (テーマに合う形のキーを3〜6個) を入れると、画面のまわりに 3D オブジェクトが浮かぶ`,
  },
};

const buildSystemPrompt = (audience: Audience): string => {
  const rules = AUDIENCE_RULES[audience];
  return `${rules.role}
出力するのは、ナレーション付きの動画 (1920x1080) の台本JSONです。

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
- heading: 見出し (title / section / outro では不要。子ども向けでは15字以内)
- chapter: 左下の章タグ (例: "02 しくみ"。省略可)
- lines: ナレーションの配列 (各シーン1〜4セリフ)

lines の各要素: { "text": "読み上げと字幕に使う日本語", "reveal": ["要素ID", ...], "focus": ["要素ID", ...], "speech": "読み上げ用 (省略可)" }
- 一番伝えたい語句は **で囲む** と字幕で色が変わる (1セリフに1か所まで。読み上げには影響しない)
- reveal: そのセリフの開始時に出現させる要素のID。書かれない要素はシーン開始から表示される
- focus: そのセリフの間だけ強調する要素のID (他の要素は薄くなる)。いま話している物を指すのに使う (省略可)
- speech: 読み上げだけ変えたいとき (漢字の読みを直すなど)。字幕は text のまま

${rules.voice}

${rules.visual}

## layout と content
1. "title": 動画の最初のタイトル画面。content = { "kicker": "短いラベル(省略可)", "title": "タイトル(改行は\\n、**強調**可)", "subtitle": "補足(省略可)", "objects": ["形のキー", ...] (省略可・6個まで) }。最初のシーンは必ず title。
2. "section": 章扉。content = { "number": "01", "title": "章タイトル", "subtitle": "補足(省略可)", "objects": ["形のキー", ...] (省略可・4個まで) }。5シーン以上の動画では章ごとに入れる。
3. ${SCENE3D_SPEC}
4. "statement": 一文を大きく見せるキメの画面。content = { "text": "20字程度の一文 (**強調**にマーカーが引かれる。改行は\\n)", "sub": "補足(省略可)", "icon": "…(省略可)" }。要素IDは "text" と "sub"。結論や驚きの事実に使う。
5. "flow": 横並びのステップカード。content = { "steps": [ { "id": "step-1", "icon": "…", "title": "短い名前", "body": "補足(省略可)" }, ... ] }。steps は3〜4個。矢印は "arrow-1", "arrow-2", ... というIDで自動的に用意される。
6. "compare": 左右比較 (中央に VS が出る)。content = { "leftTitle": "…", "rightTitle": "…", "left": [カード...], "right": [カード...] }。カード = { "id": "left-1", "icon": "…", "title": "…", "body": "…(省略可)", "tone": "normal または warning" }。左右それぞれ1〜2枚。
7. "bullets": 縦の箇条書き。content = { "items": [ { "id": "p-1", "icon": "…", "title": "…", "body": "…(省略可)" }, ... ] }。items は2〜4個。
8. "stats": 数字の強調カード (数字がカウントアップする)。content = { "items": [ { "id": "s-1", "value": "3倍", "label": "短いラベル", "body": "補足(省略可)" }, ... ] }。items は2〜4個。
9. "ranking": ランキング。content = { "items": [ { "id": "r-1", "title": "…", "body": "…(省略可)", "icon": "…(省略可)" }, ... ] }。items は1位から順に3〜5個。下位から順に reveal すると盛り上がる。
10. "checklist": 番号付きチェックリスト。content = { "items": [ { "id": "c-1", "text": "…", "note": "…(省略可)" }, ... ] }。items は2〜4個。おさらいに使う。
11. "inputOutput": 入力→変換→出力。content = { "input": { "id": "input", "icon": "…", "title": "…", "body": "…" }, "transform": { "id": "transform", "label": "短い説明" }, "output": { "id": "output", "icon": "…", "title": "…", "body": "…" } }。矢印は arrow-1 / arrow-2。
12. "outro": 最後のお礼と登録のお願い。content = { "title": "ご視聴ありがとうございました", "message": "次回予告など(省略可)" }。最後のシーンは必ず outro。

## ルール
- シーン全体は6〜12個。1画面の情報量は絞る。同じレイアウトを3回以上連続させない
- icon に使えるキー: ${ICON_NAMES.join(', ')}
- 要素の id はシーン内で重複しない。reveal / focus に書くIDは必ずそのシーンの content に存在する
- outro では高評価とチャンネル登録を自然に呼びかける`;
};

interface IssueLike {
  path: PropertyKey[];
  message: string;
}

const formatIssues = (issues: IssueLike[]): string =>
  issues.map((issue) => `- ${issue.path.join('.') || '(ルート)'}: ${issue.message}`).join('\n');

const parseArgs = (args: string[]): { url?: string; prompt?: string; theme?: string; audience?: string } => {
  let url: string | undefined;
  let prompt: string | undefined;
  let theme: string | undefined;
  let audience: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url') {
      url = args[i + 1];
      i++;
    } else if (args[i] === '--theme') {
      theme = args[i + 1];
      i++;
    } else if (args[i] === '--audience') {
      audience = args[i + 1];
      i++;
    } else {
      prompt = args[i];
    }
  }
  return { url, prompt, theme, audience };
};

const parseAudience = (value: string | undefined): Audience => {
  if (value === undefined || value === '' || value === 'kids') {
    return 'kids';
  }
  if (value === 'general') {
    return 'general';
  }
  throw new Error(`--audience には kids または general を指定してください ("${value}")`);
};

/**
 * 配色テーマ。auto (既定) は子ども向けなら kids、大人向けなら既存の台本のまま。
 * keep は常に既存の台本のまま。それ以外はテーマ名。
 */
const resolveThemeOption = (value: string | undefined, audience: Audience): ThemeName | 'keep' => {
  if (value === undefined || value === '' || value === 'auto') {
    return audience === 'kids' ? 'kids' : 'keep';
  }
  if (value === 'keep') {
    return 'keep';
  }
  return themeNameSchema.parse(value);
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
  const { url, prompt, theme, audience: audienceArg } = parseArgs(process.argv.slice(2));
  const audience = parseAudience(audienceArg);
  const themeOption = resolveThemeOption(theme, audience);
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
  console.log(`台本を生成中 (model: ${cfg.model} / 対象: ${audience === 'kids' ? '子ども向け' : '一般向け'}) ...`);

  const systemPrompt = buildSystemPrompt(audience);

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
    ...(themeOption !== 'keep' ? { theme: themeOption } : null),
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
