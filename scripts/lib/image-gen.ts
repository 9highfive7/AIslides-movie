/**
 * 画像生成 AI (layered の素材) を呼び出す。Gemini と OpenAI (gpt-image) に対応。
 *
 * どれを使うか (IMAGE_PROVIDER で明示も可: gemini / openai):
 *   GEMINI_API_KEY (または GOOGLE_API_KEY) があれば Gemini (既定 gemini-2.5-flash-image)
 *   なければ OPENAI_API_KEY があれば OpenAI (既定 gpt-image-1)
 *   どちらもなければ使えない (layered の絵は仮の枠になる)
 * モデルは IMAGE_MODEL で変えられる (新しいモデルが出たらここで切り替える)。
 *
 * 物の絵は背景を透明にしたいが、透明な背景を出せるかはモデルや時期によって違う。
 * そこで、どのモデルにも「真っ白な無地の背景」で描かせ、白い背景をこちらで消して透明にする。
 */
import sharp from 'sharp';

export type ImageKind = 'background' | 'foreground' | 'object';

export interface ImageProvider {
  provider: 'gemini' | 'openai';
  model: string;
  apiKey: string;
}

/** 使える画像生成 AI。キーがなければ null */
export const resolveImageProvider = (): ImageProvider | null => {
  const forced = process.env.IMAGE_PROVIDER;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  const useGemini = forced === 'gemini' || (forced !== 'openai' && Boolean(geminiKey));
  if (useGemini && geminiKey) {
    return { provider: 'gemini', model: process.env.IMAGE_MODEL ?? 'gemini-2.5-flash-image', apiKey: geminiKey };
  }
  if (!useGemini && openaiKey) {
    return { provider: 'openai', model: process.env.IMAGE_MODEL ?? 'gpt-image-1', apiKey: openaiKey };
  }
  return null;
};

/** 画像の種類ごとに、プロンプトの後ろに足す決まりごと */
const RULES: Record<ImageKind, string> = {
  background:
    'Wide 16:9 background scene for an explainer video. No people, no text, no letters, no numbers, no logos, no signs with writing, no watermark. ' +
    'Leave the lower center fairly open so objects can be placed in front of it.',
  object:
    'A single isolated object, the whole object visible and centered with some margin, nothing else in the frame. ' +
    'Plain solid pure white background (#FFFFFF) with no gradient, no floor, no cast shadow. ' +
    'No text, no letters, no numbers, no logos, no watermark.',
  foreground:
    'Foreground decoration for a 16:9 video frame, only along the bottom-left and bottom-right edges; the rest of the frame is plain solid pure white (#FFFFFF). ' +
    'No text, no letters, no logos, no watermark.',
};

/** 実際に画像生成 AI へ送るプロンプト (キャッシュのキーにも使う) */
export const buildImagePrompt = (kind: ImageKind, prompt: string, style: string | undefined): string =>
  [prompt.trim(), style?.trim() ? `Art style: ${style.trim()}` : '', RULES[kind]].filter(Boolean).join('\n');

const fail = (p: ImageProvider, status: number | string, body: string): Error =>
  new Error(
    `画像生成 AI の呼び出しに失敗しました (${p.provider} / ${p.model}, ${status}): ${body.slice(0, 400)}\n` +
      'APIキー・モデル名 (IMAGE_MODEL) と、指示 (prompt) の内容を確認してください (安全性の判定で断られたときは書き換えが必要です)。',
  );

/** Gemini: generateContent で画像を受け取る */
const callGemini = async (p: ImageProvider, kind: ImageKind, prompt: string): Promise<Buffer> => {
  const base = (process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/v1beta/models/${encodeURIComponent(p.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: kind === 'object' ? '1:1' : '16:9' },
      },
    }),
    signal: AbortSignal.timeout(180000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw fail(p, `HTTP ${res.status}`, text);
  }
  type Part = { text?: string; thought?: boolean; inlineData?: { data?: string }; inline_data?: { data?: string } };
  const data = JSON.parse(text) as {
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // 途中の下書き (thought) の画像は飛ばし、最後の画像を使う
  const image = parts.filter((part) => !part.thought).reverse().find((part) => part.inlineData?.data ?? part.inline_data?.data);
  const b64 = image?.inlineData?.data ?? image?.inline_data?.data;
  if (!b64) {
    const reason = data.promptFeedback?.blockReason ?? data.candidates?.[0]?.finishReason ?? parts.map((part) => part.text).join(' ');
    throw fail(p, '画像なし', reason || text);
  }
  return Buffer.from(b64, 'base64');
};

/** OpenAI: Images API (gpt-image) */
const callOpenAi = async (p: ImageProvider, kind: ImageKind, prompt: string): Promise<Buffer> => {
  const base = (process.env.OPENAI_IMAGE_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify({
      model: p.model,
      prompt,
      size: kind === 'object' ? '1024x1024' : '1536x1024',
      quality: process.env.IMAGE_QUALITY ?? 'medium',
      n: 1,
    }),
    signal: AbortSignal.timeout(300000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw fail(p, `HTTP ${res.status}`, text);
  }
  const data = JSON.parse(text) as { data?: { b64_json?: string; url?: string }[] };
  const first = data.data?.[0];
  if (first?.b64_json) {
    return Buffer.from(first.b64_json, 'base64');
  }
  if (first?.url) {
    const img = await fetch(first.url, { signal: AbortSignal.timeout(120000) });
    return Buffer.from(await img.arrayBuffer());
  }
  throw fail(p, '画像なし', text);
};

/** 2つの色の差 (RGB の距離) */
const distance = (r: number, g: number, b: number, bg: [number, number, number]): number =>
  Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);

/**
 * 画像の外周につながった「背景色に近い」画素を透明にする (塗りつぶしの要領)。
 * 物の内側にある白 (ラベルの白など) は外周とつながっていないので残る。
 * 境目は少しだけ半透明にして、ギザギザを目立たなくする。
 * 外周の色がそろっていない (無地の背景でない) ときや、もともと透明なときは何もしない。
 */
export const removeBackground = async (input: Buffer): Promise<Buffer> => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x: number, y: number) => (y * w + x) * 4;

  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(px(x, 0), px(x, h - 1));
  for (let y = 0; y < h; y++) border.push(px(0, y), px(w - 1, y));
  const transparentEdge = border.filter((i) => data[i + 3] < 16).length / border.length;
  if (transparentEdge > 0.9) {
    return sharp(data, { raw: info }).png().toBuffer();
  }
  // 背景色 = 外周の画素の中央値 (ふつうは白)
  const median = (c: number): number => {
    const values = border.map((i) => data[i + c]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const bg: [number, number, number] = [median(0), median(1), median(2)];
  const near = border.filter((i) => distance(data[i], data[i + 1], data[i + 2], bg) < 30).length / border.length;
  if (near < 0.6) {
    // 外周の色がばらばら = 無地の背景ではない (風景ごと描かれた) ので、消さずに返す
    return sharp(data, { raw: info }).png().toBuffer();
  }

  const HARD = 22; // これより近い色は完全に透明
  const SOFT = 56; // ここまでは半透明にして広げる (これより遠い色で止まる)
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (x: number, y: number) => {
    const k = y * w + x;
    if (seen[k]) return;
    const i = k * 4;
    if (distance(data[i], data[i + 1], data[i + 2], bg) >= SOFT) return;
    seen[k] = 1;
    queue[tail++] = k;
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (head < tail) {
    const k = queue[head++];
    const x = k % w;
    const y = (k - x) / w;
    const i = k * 4;
    const d = distance(data[i], data[i + 1], data[i + 2], bg);
    data[i + 3] = d <= HARD ? 0 : Math.min(data[i + 3], Math.round(((d - HARD) / (SOFT - HARD)) * 255));
    // 半透明の境目より先へは広げない (物の内側の白まで消さないように)
    if (d > HARD) continue;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  return sharp(data, { raw: info }).png().toBuffer();
};

/** 透明でない部分だけを切り出す (余白を詰める) */
const trimTransparent = async (png: Buffer): Promise<Buffer> => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 12) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < 0) {
    throw new Error('生成された物の絵が背景と一緒に消えてしまいました (白い物は背景と区別できません)。prompt に色を書いてください。');
  }
  return sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer();
};

/**
 * 1枚作って、動画で使える形に整える。
 *   background: 1920x1080 の JPEG / foreground: 背景を消した 1920x1080 の PNG / object: 背景を消して余白を詰めた PNG
 * 戻り値はファイルの中身と拡張子。
 */
export const generateImage = async (
  provider: ImageProvider,
  kind: ImageKind,
  prompt: string,
): Promise<{ data: Buffer; ext: 'jpg' | 'png' }> => {
  const raw = provider.provider === 'gemini' ? await callGemini(provider, kind, prompt) : await callOpenAi(provider, kind, prompt);
  if (kind === 'background') {
    return { data: await sharp(raw).resize(1920, 1080, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer(), ext: 'jpg' };
  }
  const cut = await removeBackground(raw);
  if (kind === 'foreground') {
    return { data: await sharp(cut).resize(1920, 1080, { fit: 'cover' }).png().toBuffer(), ext: 'png' };
  }
  const trimmed = await trimTransparent(cut);
  return { data: await sharp(trimmed).resize({ height: 1200, withoutEnlargement: true }).png().toBuffer(), ext: 'png' };
};
