/**
 * セリフ・見出しで使える簡易マークアップ。
 *   **強調**  → 字幕や statement レイアウトでハイライト表示される
 * 読み上げ (VOICEVOX) には stripMarkup 後のテキストを渡す。
 */
export interface MarkupSegment {
  text: string;
  strong: boolean;
}

export const parseMarkup = (text: string): MarkupSegment[] => {
  const segments: MarkupSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ text: text.slice(last, index), strong: false });
    }
    segments.push({ text: match[1], strong: true });
    last = index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last), strong: false });
  }
  return segments;
};

export const stripMarkup = (text: string): string => text.replace(/\*\*(.+?)\*\*/g, '$1');
