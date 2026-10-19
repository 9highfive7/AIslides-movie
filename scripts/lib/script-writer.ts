/**
 * 台本 (script.json) を AI に書かせる・直させる共通処理。
 * CLI (npm run script) と動画生成アプリ (npm run studio) の両方から使う。
 *
 * AI の選び方 (SCRIPT_PROVIDER で明示も可: claude / openai):
 *   ANTHROPIC_API_KEY (または ANTHROPIC_AUTH_TOKEN) があれば Claude (既定 claude-opus-5-5)
 *   なければ OPENAI_API_KEY があれば OpenAI 互換 API
 *   どちらもなければ Claude (`ant auth login` のプロファイルで認証できればそれを使う)
 */
import { scriptSchema, type ScriptConfig } from '../../src/schemas';
import { lintScript } from '../../src/elements';
import { ICON_NAMES } from '../../src/components/IconBox';
import { BUILD_BASIC_SHAPES, BUILD_COLORS, BUILD_PROPS, COLOR_NAMES, SHAPES, SHAPE_NAMES } from '../../src/three/catalog';
import { chatJson, extractJson, resolveLlmConfig } from './llm';
import { CLAUDE_MODEL, claudeText, hasClaudeEnvCredentials } from './claude';

export const scriptProvider = (): { provider: 'claude' | 'openai'; model: string } => {
  const forced = process.env.SCRIPT_PROVIDER;
  const useOpenAi = forced === 'openai' || (forced !== 'claude' && !hasClaudeEnvCredentials() && Boolean(process.env.OPENAI_API_KEY));
  return useOpenAi
    ? { provider: 'openai', model: process.env.SCRIPT_MODEL ?? 'gpt-4o-mini' }
    : { provider: 'claude', model: CLAUDE_MODEL };
};

const askJson = async (system: string, user: string): Promise<unknown> => {
  const raw = scriptProvider().provider === 'openai' ? await chatJson(resolveLlmConfig(), system, user) : await claudeText(system, user);
  return extractJson(raw);
};

/** 台本の対象。kids: 小学生にもわかる解説 + 3D オブジェクト中心 / general: 大人向けの解説 */
export type Audience = 'kids' | 'general';

const SHAPE_LIST = SHAPE_NAMES.map((name) => `${name}(${SHAPES[name].ja})`).join(', ');
const BASIC_LIST = Object.entries(BUILD_BASIC_SHAPES)
  .map(([name, ja]) => `${name}(${ja})`)
  .join(' / ');
const PROP_LIST = Object.entries(BUILD_PROPS)
  .map(([name, prop]) => `${name}(${prop.ja})`)
  .join(' / ');

/** 見せ方 (3D オブジェクト・作り込んだ場面・組み立てる図解) の説明。子ども向け・大人向けで共通 */
const SCENE3D_SPEC = `"scene3d": 3D オブジェクトを舞台に並べて見せる。物が上から落ちてきて弾み、説明中の物はぴょんぴょん跳ねる。content = { "arrangement": "row | flow | cycle", "objects": [ { "id": "o-1", "shape": "形のキー", "label": "名札 (8字以内)", "color": "色名 (省略可)", "count": 数 (省略可。1〜12), "size": 大きさ (省略可。0.5〜2) }, ... ], "caption": "ひとこと (省略可。25字以内)" }。objects は1〜5個。
   - row: 横に並べる (しょうかい・くらべる)。flow: 左から右へ矢印でつなぐ (じゅんばん・原因と結果。矢印のIDは "arrow-1", "arrow-2", ...)。cycle: 輪にして矢印で一周する (くりかえし・じゅんかん。物は2個以上。矢印のIDは "arrow-1"〜"arrow-N")
   - 数は count で見せる (「りんごが3こ」→ shape: "apple", count: 3。1こずつ順に出てくるので数えられる)
   - 大きさの違いは size で見せる (小さい 0.5 / ふつう 1 / 大きい 1.8)
   - 目に見えないもの・むずかしいものも、形のある物にたとえる (データ → letter / お金 → coin / 時間 → clock / ふえる → arrow-up / へる → arrow-down / AI → robot / ひらめき → lightbulb / なぜ？ → question)
   - 要素ID: objects の各 id・矢印 arrow-N・"caption"
   - shape に使えるキー (必ずこの中から選ぶ): ${SHAPE_LIST}
   - color に使える色名: ${Object.keys(COLOR_NAMES).join(', ')}
   - もう1つの形 (作り込んだ 3D の場面): content = { "preset": "…", "title": "上部の一文(省略可・**強調**可)", "stat": { "kicker": "…", "value": "190億個", "note": "出典" }(省略可), "callouts": [ { "id": "…", "title": "…", "sub": "…", "tone": "accent / warning / muted / normal" } ](省略可) }。preset と要素ID: "phoneChip" (スマホの箱が開きチップへ寄る。open / label / zoom、content.label = { title, sub }) / "vendingCount" (自販機1台 → 大量の自販機。machine / many) / "vendingHotCold" (自販機の左右に冷たさと熱の玉。machine / cold / heat、callouts は 冷たさ・熱 の順に2つ) / "vendingCutaway" (扉が開き管の中を熱が流れる。open / flow、callouts は 吸熱・圧縮・放熱・膨張 の順に4つ) / "heatReuse" (冷蔵庫は熱を捨て、自販機は回す。left / right、callouts は 捨てる熱・回す熱 の2つ) / "vendingEnergy" (自販機→稲妻→家とカレンダー。machine / bolt / house / months、callouts は カレンダーに1つ)。title / stat / 各 callout の id も reveal に書ける。題材に合う preset がなければ使わない。
   - 3つ目の形 (組み立てる 3D の図解。自販機の透視図のように、題材の物を基本形の組み合わせで作り込み、絵本風のベタ塗り + 黒い輪郭線で描く): content = { "title": "上部の一文(省略可・**強調**可)", "parts": [ { "id": "body", "shape": "box", "size": [幅, 高さ, 奥行き], "at": [x, y, z], "color": "navy", "turn": 向き(度・省略可), "tilt": 傾き(度・省略可), "text": "正面の文字(省略可・8字以内)", "label": "上に浮かぶ名札(省略可・8字以内)", "ghost": true (中を見せる半透明の外箱・省略可), "enter": "pop | drop | grow | fade" (省略可), "motion": "none | spin | bob | pulse" (省略可), "repeat": { "count": 2〜60, "columns": 列数, "gap": 間隔 } (同じ物を奥へ並べる・省略可) }, ... ], "flows": [ { "id": "f-1", "path": [[x, y, z], ...], "kind": "heat | cold | dots | arrow", "color": "色名(省略可)", "pipe": true, "loop": false, "speed": 1 } ] (省略可・6本まで), "callouts": [ { "id": "c-1", "target": "指す部品か流れの id", "title": "…", "sub": "…", "tone": "accent / warning / muted / normal" } ] (省略可・4つまで。箱の位置は自動), "stat": { "kicker": "…", "value": "…", "note": "出典" } (省略可), "camera": { "view": "front | left | right | top | low", "zoomTo": "寄る部品の id (省略可)" } (省略可) }
     - 単位は m。y = 0 が床で、at は部品の足もと (底面の中心)。x は右、z は手前が正。場面全体は幅・高さ 1〜10 くらいにまとめる。カメラの距離は全体が画面に収まるよう自動で決まる
     - shape: 基本形 ${BASIC_LIST}、作り込んだ物 ${PROP_LIST}、または上の 3D オブジェクトのキー (基本形で作れない物だけ)。text が書けるのは box / plate / cylinder
     - 部品は 4〜20 個。台・外箱・中の部品・窓・ボタン・配線などの細部を重ねて、それらしい形に作り込む (例: パソコン = plate のキーボード + 薄い box の画面 (text: "画面") + cylinder の脚)。部品が宙に浮かないよう、重ねる部品の at の y は下の部品の高さに合わせる。中を見せたい外箱は ghost: true にして、中の部品を外箱の内側に置く
     - flows は熱・電気・水・データ・お金などの目に見えない動きを、管と流れる玉 (heat: 熱の玉 / cold: 冷たさの玉 / dots: 色の粒) か、伸びていく矢印 (arrow) で見せる。path は部品の位置に合わせて通す (部品の表面より少し手前・上を通すと見やすい)
     - enter: pop (弾んで出る・既定) / drop (上から落ちる) / grow (下から伸びる。棒グラフ・ビル・水位) / fade。motion: spin (回る。ファン・歯車) / bob (浮かぶ) / pulse (脈打つ。光る・熱い)
     - color に使える色名: ${Object.keys(BUILD_COLORS).join(', ')} (または #RRGGBB)
     - 要素ID: parts・flows・callouts の各 id・"title"・"stat"・"zoom" (camera.zoomTo があるとき。reveal するとその部品へ寄る)。reveal しない部品はシーン冒頭に順に出る。説明の順に部品・流れ・注釈を reveal すると、組み立てていくように見える`;

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

export const buildSystemPrompt = (audience: Audience): string => {
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
12. "share": 1本の帯を区切って割合 (シェア) を見せるグラフ。content = { "title": "グラフの題(省略可)", "segments": [ { "id": "sh-1", "display": "約5割", "label": "日本製(省略可)", "value": 50, "tone": "warning / accent / muted" }, ... ], "source": "出典(省略可)" }。segments は1〜3個。区分は reveal したときに左から伸びる。
13. "outro": 最後のお礼と登録のお願い。content = { "title": "ご視聴ありがとうございました", "message": "次回予告など(省略可)" }。最後のシーンは必ず outro。

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


/** スキーマ検証 + 要素IDの整合性チェック。問題があればメッセージの配列を返す */
export const validateScript = (value: unknown): { data?: ScriptConfig; problems: string[] } => {
  const parsed = scriptSchema.safeParse(value);
  if (!parsed.success) {
    return { problems: [formatIssues(parsed.error.issues)] };
  }
  const lint = lintScript(parsed.data);
  return lint.length > 0 ? { problems: lint.map((m) => `- ${m}`) } : { data: parsed.data, problems: [] };
};

/** AI に JSON を出させ、形式が不正なら1回だけエラーを伝えて直させる */
const askValidScript = async (system: string, request: string, onStatus?: (message: string) => void): Promise<ScriptConfig> => {
  let result = validateScript(await askJson(system, request));
  if (!result.data) {
    onStatus?.('台本の形式を直しています');
    const repair = `${request}\n\n-----\n前回の出力には次のエラーがありました。エラーをすべて修正した完全なJSONを再度出力してください。\n${result.problems.join('\n')}`;
    result = validateScript(await askJson(system, repair));
  }
  if (!result.data) {
    throw new Error(`生成された台本の形式が不正です (2回試行しました):\n${result.problems.join('\n')}`);
  }
  return result.data;
};

/** 資料 (依頼文・ページ本文) から台本を作る */
export const writeScript = (
  material: string,
  onStatus?: (message: string) => void,
  audience: Audience = 'kids',
): Promise<ScriptConfig> => askValidScript(buildSystemPrompt(audience), material, onStatus);

/**
 * 既存の台本を、修正の指示どおりに直す。
 * sceneId を指定すると、そのシーンだけを差し替える (他のシーンは AI が書き換えても元のまま残す)。
 */
export const reviseScript = async (
  current: ScriptConfig,
  instruction: string,
  sceneId: string | null,
  onStatus?: (message: string) => void,
  audience: Audience = 'kids',
): Promise<ScriptConfig> => {
  const target = sceneId ? current.scenes.find((s) => s.id === sceneId) : null;
  if (sceneId && !target) {
    throw new Error(`シーン "${sceneId}" が台本にありません。`);
  }
  const scope = target
    ? `修正の対象はシーン "${target.id}" だけです。他のシーンは一字一句変えずにそのまま出力してください。`
    : '動画全体に対する修正です。指示に関係のない部分は変えないでください。';
  const request =
    `次の台本 (JSON) を、修正の指示に従って直してください。直した後の台本全体を、同じ形式のJSONで出力してください。\n` +
    `${scope}\n\n## 修正の指示\n${instruction}\n\n## 今の台本\n${JSON.stringify(current, null, 2)}`;
  const revised = await askValidScript(buildSystemPrompt(audience), request, onStatus);
  if (!target) {
    return { ...revised, meta: { ...current.meta, ...revised.meta } };
  }
  const replacement = revised.scenes.find((s) => s.id === target.id);
  if (!replacement) {
    throw new Error(`修正後の台本にシーン "${target.id}" が見つかりませんでした。もう一度試してください。`);
  }
  const merged = { ...current, scenes: current.scenes.map((s) => (s.id === target.id ? replacement : s)) };
  const check = validateScript(merged);
  if (!check.data) {
    throw new Error(`修正したシーンに問題があります:\n${check.problems.join('\n')}`);
  }
  return check.data;
};
