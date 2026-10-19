/**
 * 画像生成 AI (layered の素材) を呼び出す。Gemini を使う。
 *
 * キーは GEMINI_API_KEY または GOOGLE_API_KEY (既定 gemini-3.1-flash-lite-image)。
 * キーがなければ使えない (layered の絵は仮の枠になる)。
 * モデルは IMAGE_MODEL で変えられる (新しいモデルが出たらここで切り替える)。
 *
 * 物の絵は背景を透明にしたいが、透明な背景を出せるかはモデルや時期によって違う。
 * そこで、どのモデルにも「真っ白な無地の背景」で描かせ、白い背景をこちらで消して透明にする。
 */
import sharp from 'sharp';

export type ImageKind = 'background' | 'foreground' | 'object';

export interface ImageProvider {
  provider: 'gemini';
  model: string;
  apiKey: string;
}

/** 使える画像生成 AI。キーがなければ null */
export const resolveImageProvider = (): ImageProvider | null => {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  return geminiKey ? { provider: 'gemini', model: process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-lite-image', apiKey: geminiKey } : null;
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

/** 縦の動画 (ショート) の背景・手前の決まりごと。物の絵は横の動画と同じ (正方形で描いて切り抜く) */
const VERTICAL_RULES: Record<Exclude<ImageKind, 'object'>, string> = {
  background:
    'Tall vertical 9:16 background scene for a smartphone short video. No people, no text, no letters, no numbers, no logos, no signs with writing, no watermark. ' +
    'Leave the middle and lower middle fairly open so objects can be placed in front of it.',
  foreground:
    'Foreground decoration for a tall vertical 9:16 video frame, only along the bottom-left and bottom-right edges; the rest of the frame is plain solid pure white (#FFFFFF). ' +
    'No text, no letters, no logos, no watermark.',
};

const rulesFor = (kind: ImageKind, vertical: boolean): string => (vertical && kind !== 'object' ? VERTICAL_RULES[kind] : RULES[kind]);

/** 絵の縦横比 (Gemini の aspectRatio)。物は正方形、背景・手前は動画の向きに合わせる */
const aspectOf = (kind: ImageKind, vertical: boolean): '1:1' | '16:9' | '9:16' => (kind === 'object' ? '1:1' : vertical ? '9:16' : '16:9');

/** 実際に画像生成 AI へ送るプロンプト (キャッシュのキーにも使う)。vertical: 縦の動画 (ショート) の絵 */
export const buildImagePrompt = (kind: ImageKind, prompt: string, style: string | undefined, vertical = false): string =>
  [prompt.trim(), style?.trim() ? `Art style: ${style.trim()}` : '', rulesFor(kind, vertical)].filter(Boolean).join('\n');

const fail = (p: ImageProvider, status: number | string, body: string): Error =>
  new Error(
    `画像生成 AI の呼び出しに失敗しました (${p.provider} / ${p.model}, ${status}): ${body.slice(0, 400)}\n` +
      'APIキー・モデル名 (IMAGE_MODEL) と、指示 (prompt) の内容を確認してください (安全性の判定で断られたときは書き換えが必要です)。',
  );

/** Gemini: generateContent で画像を受け取る */
const callGemini = async (p: ImageProvider, kind: ImageKind, prompt: string, vertical: boolean): Promise<Buffer> => {
  const base = (process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
  const res = await fetch(`${base}/v1beta/models/${encodeURIComponent(p.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: aspectOf(kind, vertical) },
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

/**
 * 切り抜いた絵のふちに残る白いにじみ (フリンジ) を取る。背景に重ねたときに「切り貼りした」感じが出る主な原因。
 *   1. 半透明のふちの色から、混ざっていた背景の白を差し引く (色の分離)
 *   2. 不透明な部分の輪郭を 1px 内側へ削り、ふちを少しぼかしてなじませる
 * 背景を消した PNG ならいつでもかけられる (前に作った絵にも、作り直さずにかけられる)。
 */
export const defringe = async (png: Buffer, bg: [number, number, number] = [255, 255, 255]): Promise<Buffer> => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alpha = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) alpha[k] = data[k * 4 + 3];

  // 1px 削る (まわり 3x3 の最小値) → 3x3 の平均でぼかす
  const eroded = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          const a = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : alpha[yy * w + xx];
          if (a < min) min = a;
        }
      }
      eroded[y * w + x] = min;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const a0 = alpha[k];
      if (a0 === 0) continue;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          sum += xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : eroded[yy * w + xx];
        }
      }
      const a1 = Math.min(a0, Math.round(sum / 9));
      const i = k * 4;
      if (a0 < 255) {
        // 見えている色 = 物の色 * a + 背景の白 * (1 - a) なので、白の分を引いて物の色に戻す
        const a = Math.max(a0 / 255, 0.2);
        for (let c = 0; c < 3; c++) {
          data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - bg[c] * (1 - a)) / a)));
        }
      }
      data[i + 3] = a1;
    }
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
 *   (vertical: 縦の動画 (ショート) では、背景・手前を 1080x1920 にする)
 * 戻り値はファイルの中身と拡張子。
 */
export const generateImage = async (
  provider: ImageProvider,
  kind: ImageKind,
  prompt: string,
  vertical = false,
): Promise<{ data: Buffer; ext: 'jpg' | 'png' }> => {
  const raw = await callGemini(provider, kind, prompt, vertical);
  const [w, h] = vertical ? [1080, 1920] : [1920, 1080];
  if (kind === 'background') {
    return { data: await sharp(raw).resize(w, h, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer(), ext: 'jpg' };
  }
  const cut = await removeBackground(raw);
  if (kind === 'foreground') {
    return { data: await sharp(cut).resize(w, h, { fit: 'cover' }).png().toBuffer(), ext: 'png' };
  }
  const trimmed = await trimTransparent(cut);
  return { data: await sharp(trimmed).resize({ height: 1200, withoutEnlargement: true }).png().toBuffer(), ext: 'png' };
};
