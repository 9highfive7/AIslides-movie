/** ウェブページを取得して本文テキストを抽出する (台本生成の素材用) */
export interface PageContent {
  url: string;
  title: string;
  text: string;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');

export const fetchPageText = async (url: string): Promise<PageContent> => {
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`URL は http(s) で始まる必要があります: ${url}`);
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; narration-slides-script-generator)' },
    signal: AbortSignal.timeout(30000),
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(
      `ページを取得できませんでした: HTTP ${res.status} (${url})\n` +
        'ログインが必要なページやボット対策のあるページには対応していません。テキストをコピーしてプロンプトとして渡してください。',
    );
  }

  const html = await res.text();
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim());
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeEntities(body)
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 50) {
    throw new Error(
      'ページから本文を抽出できませんでした (JavaScriptで描画されている可能性があります)。\nテキストをコピーしてプロンプトとして渡してください。',
    );
  }
  return { url, title, text: text.slice(0, 8000) };
};
