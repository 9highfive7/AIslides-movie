/**
 * 音声生成スクリプト (scripts/) と Remotion 側 (src/) の双方から参照される
 * タイミング定数。ここを変更したら npm run audio で timeline.json を再生成する。
 */

/** 動画のフレームレート */
export const FPS = 30;

/** セリフ (line) 間に空ける間隔 [秒] */
export const GAP_BETWEEN_LINES_SEC = 0.3;

/** シーン開始から最初のセリフまでの余白 [秒] */
export const SCENE_LEAD_SEC = 0.6;

/** 最後のセリフ終了からシーン終了までの余白 [秒] */
export const SCENE_TAIL_SEC = 0.8;

export const secToFrames = (sec: number): number => Math.round(sec * FPS);

export const GAP_BETWEEN_LINES_FRAMES = secToFrames(GAP_BETWEEN_LINES_SEC);
export const SCENE_LEAD_FRAMES = secToFrames(SCENE_LEAD_SEC);
export const SCENE_TAIL_FRAMES = secToFrames(SCENE_TAIL_SEC);
