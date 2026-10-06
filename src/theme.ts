/**
 * デザイントークン。配色は「淡いグレー寄りの青の背景 × 濃紺 × アクセント青1色 ×
 * 控えめな警告赤」。グラデーション・ネオン・紫は使わない。
 */
export const COLORS = {
  /** 背景の淡いグレー寄りブルー */
  bg: '#F3F6FA',
  /** メインの濃紺 */
  ink: '#0F1F3D',
  /** アクセント (青1色) */
  accent: '#2B5FC7',
  /** アイコン四角などの淡いアクセント背景 */
  accentSoft: 'rgba(43, 95, 199, 0.10)',
  accentBorder: 'rgba(43, 95, 199, 0.32)',
  /** 濃紺背景上で使うアクセントの明色 (同じ青系統) */
  accentOnDark: '#9DB9F2',
  /** 控えめな警告赤 */
  warning: '#B0432F',
  warningSoft: 'rgba(176, 67, 47, 0.10)',
  textSecondary: 'rgba(15, 31, 61, 0.64)',
  textFaint: 'rgba(15, 31, 61, 0.45)',
  line: 'rgba(15, 31, 61, 0.10)',
  onDarkSecondary: 'rgba(255, 255, 255, 0.78)',
  onDarkLine: 'rgba(255, 255, 255, 0.28)',
} as const;

export const FONT_FAMILY = 'Noto Sans JP';

/** 白背景カード: ごく薄い影・角丸小さめ */
export const CARD = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(15, 31, 61, 0.06)',
} as const;

/** 余白は広めに。1画面の情報量は絞る */
export const PAGE = {
  paddingX: 96,
  contentTop: 300,
} as const;

/** 要素の出現アニメーションの長さ [フレーム] (約0.4秒) */
export const REVEAL_FRAMES = 12;

/** シーン切り替えクロスフェードの長さ [フレーム] (0.5秒) */
export const CROSSFADE_FRAMES = 15;

/** 字幕切替フェードの長さ [フレーム] */
export const SUBTITLE_FADE_FRAMES = 6;
