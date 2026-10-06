/**
 * モックモード用の概算読み時間。文字種ごとの粗い係数で見積もる。
 * 実際の VOICEVOX の尺とは乖離があるため、タイミング設計の確認用としてのみ使う。
 */
export const estimateDurationSec = (text: string, speedScale: number): number => {
  let seconds = 0.25; // 冒頭の息継ぎ
  for (const ch of text) {
    if (/[、。！？!?,.]/.test(ch)) {
      seconds += 0.28; // 読点・句点のポーズ
    } else if (/[ぁ-んー]/.test(ch)) {
      seconds += 0.16;
    } else if (/[ァ-ヴ]/.test(ch)) {
      seconds += 0.15;
    } else if (/[一-龠々]/.test(ch)) {
      seconds += 0.19;
    } else {
      seconds += 0.14;
    }
  }
  return seconds / Math.max(0.5, speedScale);
};
