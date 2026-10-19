import { createContext, useContext, type CSSProperties } from 'react';
import type { Meta, ThemeName } from '../schemas';

/**
 * デザイントークン。配色は meta.theme で切り替える。
 *   kids:  空色 × 原色に近いはっきりした色 × 太い縁取り (子ども向け・既定)
 *   clean: 淡いグレー寄りの青 × 濃紺 × アクセント青1色 (落ち着いた解説向け)
 *   pop:   クリーム地 × 太い枠線 × 黄色マーカー (YouTube のバラエティ系)
 *   dark:  濃紺地 × 発光する青 (テック・ガジェット系)
 */
export interface Theme {
  name: ThemeName;
  colors: {
    bg: string;
    surface: string;
    ink: string;
    accent: string;
    accentSoft: string;
    accentBorder: string;
    onAccent: string;
    warning: string;
    warningSoft: string;
    textSecondary: string;
    textFaint: string;
    line: string;
    /** バーグラフの下地など */
    track: string;
    /** タイトル・章扉の背景 */
    darkBg: string;
    /** 濃い背景上の装飾図形 */
    darkShape: string;
    onDark: string;
    onDarkAccent: string;
    onDarkSecondary: string;
    onDarkLine: string;
    /** **強調** のマーカー背景と文字色 */
    highlight: string;
    highlightInk: string;
    /** 濃い背景 (タイトル・章扉) 上での **強調** のマーカー背景と文字色 */
    darkHighlight: string;
    darkHighlightInk: string;
    /** 背景模様の色 */
    pattern: string;
    /** 背景で漂う大きな円の色 */
    blob: string;
    subtitleBg: string;
    /** 字幕内の **強調** の文字色 */
    subtitleStrong: string;
    /** 立体 (style: "3d") のときのカードの側面 (厚みの色) */
    edge: string;
    /** scene3d の舞台の上面と側面 */
    stage: string;
    stageEdge: string;
    /** 3D の背景: 上 (空) と、床のグリッド線 */
    sky: string;
    floorLine: string;
  };
  card: CSSProperties;
  radius: number;
  pattern: 'dots' | 'grid';
  subtitleStyle: 'box' | 'outline';
  /** カードの厚み [px]。0 なら平面 (style: "flat") */
  depth: number;
  /** 3D の背景で回る積み木・ボールの色 (#RRGGBB) */
  toys: string[];
}

const clean: Theme = {
  name: 'clean',
  colors: {
    bg: '#F3F6FA',
    surface: '#FFFFFF',
    ink: '#0F1F3D',
    accent: '#2B5FC7',
    accentSoft: 'rgba(43, 95, 199, 0.10)',
    accentBorder: 'rgba(43, 95, 199, 0.32)',
    onAccent: '#FFFFFF',
    warning: '#B0432F',
    warningSoft: 'rgba(176, 67, 47, 0.10)',
    textSecondary: 'rgba(15, 31, 61, 0.64)',
    textFaint: 'rgba(15, 31, 61, 0.45)',
    line: 'rgba(15, 31, 61, 0.10)',
    track: 'rgba(15, 31, 61, 0.07)',
    darkBg: '#0F1F3D',
    darkShape: 'rgba(157, 185, 242, 0.10)',
    onDark: '#FFFFFF',
    onDarkAccent: '#9DB9F2',
    onDarkSecondary: 'rgba(255, 255, 255, 0.78)',
    onDarkLine: 'rgba(255, 255, 255, 0.28)',
    highlight: 'rgba(43, 95, 199, 0.16)',
    highlightInk: '#2B5FC7',
    darkHighlight: 'rgba(157, 185, 242, 0.28)',
    darkHighlightInk: '#FFFFFF',
    pattern: 'rgba(15, 31, 61, 0.07)',
    blob: 'rgba(43, 95, 199, 0.05)',
    subtitleBg: '#0F1F3D',
    subtitleStrong: '#9DB9F2',
    edge: '#C9D4E5',
    stage: '#E3EAF5',
    stageEdge: '#B7C5DB',
    sky: '#DCE6F5',
    floorLine: 'rgba(43, 95, 199, 0.16)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(15, 31, 61, 0.10)',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(15, 31, 61, 0.06)',
  },
  radius: 8,
  pattern: 'dots',
  subtitleStyle: 'box',
  depth: 0,
  toys: ['#2B5FC7', '#9DB9F2', '#2B5FC7', '#9DB9F2'],
};

const pop: Theme = {
  name: 'pop',
  colors: {
    bg: '#FFF9EC',
    surface: '#FFFFFF',
    ink: '#1B1B1F',
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.12)',
    accentBorder: 'rgba(37, 99, 235, 0.45)',
    onAccent: '#FFFFFF',
    warning: '#E63946',
    warningSoft: 'rgba(230, 57, 70, 0.12)',
    textSecondary: 'rgba(27, 27, 31, 0.70)',
    textFaint: 'rgba(27, 27, 31, 0.50)',
    line: 'rgba(27, 27, 31, 0.14)',
    track: 'rgba(27, 27, 31, 0.08)',
    darkBg: '#1B1B1F',
    darkShape: 'rgba(255, 214, 10, 0.12)',
    onDark: '#FFFFFF',
    onDarkAccent: '#FFD60A',
    onDarkSecondary: 'rgba(255, 255, 255, 0.82)',
    onDarkLine: 'rgba(255, 255, 255, 0.30)',
    highlight: '#FFD60A',
    highlightInk: '#1B1B1F',
    darkHighlight: '#FFD60A',
    darkHighlightInk: '#1B1B1F',
    pattern: 'rgba(27, 27, 31, 0.09)',
    blob: 'rgba(255, 196, 0, 0.16)',
    subtitleBg: '#1B1B1F',
    subtitleStrong: '#FFD60A',
    edge: '#1B1B1F',
    stage: '#FFE9A8',
    stageEdge: '#1B1B1F',
    sky: '#FFF1CC',
    floorLine: 'rgba(27, 27, 31, 0.14)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '3px solid #1B1B1F',
    borderRadius: 16,
    boxShadow: '6px 6px 0 #1B1B1F',
  },
  radius: 16,
  pattern: 'dots',
  subtitleStyle: 'outline',
  depth: 0,
  toys: ['#2563EB', '#FFD60A', '#E63946', '#FFD60A'],
};

const dark: Theme = {
  name: 'dark',
  colors: {
    bg: '#0B1220',
    surface: '#131C2E',
    ink: '#E6ECF5',
    accent: '#5B9BFF',
    accentSoft: 'rgba(91, 155, 255, 0.14)',
    accentBorder: 'rgba(91, 155, 255, 0.42)',
    onAccent: '#06101F',
    warning: '#FF6B5B',
    warningSoft: 'rgba(255, 107, 91, 0.14)',
    textSecondary: 'rgba(230, 236, 245, 0.68)',
    textFaint: 'rgba(230, 236, 245, 0.45)',
    line: 'rgba(230, 236, 245, 0.12)',
    track: 'rgba(230, 236, 245, 0.08)',
    darkBg: '#060A12',
    darkShape: 'rgba(91, 155, 255, 0.10)',
    onDark: '#FFFFFF',
    onDarkAccent: '#5B9BFF',
    onDarkSecondary: 'rgba(255, 255, 255, 0.75)',
    onDarkLine: 'rgba(255, 255, 255, 0.22)',
    highlight: 'rgba(255, 209, 102, 0.22)',
    highlightInk: '#FFD166',
    darkHighlight: 'rgba(91, 155, 255, 0.32)',
    darkHighlightInk: '#FFFFFF',
    pattern: 'rgba(91, 155, 255, 0.08)',
    blob: 'rgba(91, 155, 255, 0.07)',
    subtitleBg: 'rgba(6, 10, 18, 0.88)',
    subtitleStrong: '#FFD166',
    edge: '#05080F',
    stage: '#1B2A44',
    stageEdge: '#0E1626',
    sky: '#060A12',
    floorLine: 'rgba(91, 155, 255, 0.22)',
  },
  card: {
    backgroundColor: '#131C2E',
    border: '1px solid rgba(230, 236, 245, 0.12)',
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  },
  radius: 12,
  pattern: 'grid',
  subtitleStyle: 'box',
  depth: 0,
  toys: ['#5B9BFF', '#FFD166', '#5B9BFF', '#FF6B5B'],
};

const kids: Theme = {
  name: 'kids',
  colors: {
    bg: '#E7F5FF',
    surface: '#FFFFFF',
    ink: '#22304A',
    accent: '#1C7ED6',
    accentSoft: 'rgba(28, 126, 214, 0.12)',
    accentBorder: 'rgba(28, 126, 214, 0.45)',
    onAccent: '#FFFFFF',
    warning: '#E03131',
    warningSoft: 'rgba(224, 49, 49, 0.12)',
    textSecondary: 'rgba(34, 48, 74, 0.74)',
    textFaint: 'rgba(34, 48, 74, 0.50)',
    line: 'rgba(34, 48, 74, 0.16)',
    track: 'rgba(34, 48, 74, 0.08)',
    darkBg: '#3B5BDB',
    darkShape: 'rgba(255, 255, 255, 0.14)',
    onDark: '#FFFFFF',
    onDarkAccent: '#FFD43B',
    onDarkSecondary: 'rgba(255, 255, 255, 0.88)',
    onDarkLine: 'rgba(255, 255, 255, 0.30)',
    highlight: '#FFE066',
    highlightInk: '#22304A',
    darkHighlight: '#FFD43B',
    darkHighlightInk: '#22304A',
    pattern: 'rgba(28, 126, 214, 0.10)',
    blob: 'rgba(255, 212, 59, 0.22)',
    subtitleBg: '#22304A',
    subtitleStrong: '#FFD43B',
    edge: '#A5C8E8',
    stage: '#B2F2BB',
    stageEdge: '#69DB7C',
    sky: '#C5E6FF',
    floorLine: 'rgba(28, 126, 214, 0.18)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    border: '3px solid #22304A',
    borderRadius: 22,
    boxShadow: '0 4px 0 #22304A',
  },
  radius: 22,
  pattern: 'dots',
  subtitleStyle: 'outline',
  depth: 0,
  toys: ['#339AF0', '#FFD43B', '#FF8FA3', '#69DB7C'],
};

export const THEMES: Record<ThemeName, Theme> = { kids, clean, pop, dark };

/** カードの厚み [px] (style: "3d")。おもちゃのブロックのように側面が見える */
const DEPTH_3D = 12;

/**
 * style: "3d" のときのテーマ。カードの下に厚み (側面) と接地の影を付け、
 * 全レイアウトのカードが「積み木」のような立体になる。
 */
const with3d = (theme: Theme): Theme => ({
  ...theme,
  depth: DEPTH_3D,
  card: {
    ...theme.card,
    boxShadow: `0 ${DEPTH_3D}px 0 ${theme.colors.edge}, 0 ${DEPTH_3D + 14}px 26px rgba(0, 0, 0, 0.16)`,
  },
});

/** 台本の meta (theme / style) から使うテーマを決める */
export const resolveTheme = (meta: Pick<Meta, 'theme' | 'style'>): Theme =>
  meta.style === '3d' ? with3d(THEMES[meta.theme]) : THEMES[meta.theme];

/** #RRGGBB を明るく (amt > 0) / 暗く (amt < 0) する。解釈できない色はそのまま返す */
export const shade = (color: string, amt: number): string => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) {
    return color;
  }
  const n = parseInt(m[1], 16);
  const target = amt > 0 ? 255 : 0;
  const mix = (v: number) => Math.round(v + (target - v) * Math.abs(amt));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export const ThemeContext = createContext<Theme>(kids);

export const useTheme = (): Theme => useContext(ThemeContext);

export const FONT_FAMILY = 'Noto Sans JP';

/** 余白は広めに。1画面の情報量は絞る */
export const PAGE = {
  paddingX: 96,
  contentTop: 300,
} as const;

/** 字幕切替フェードの長さ [フレーム] */
export const SUBTITLE_FADE_FRAMES = 6;

/** フォーカス (強調) の切り替えにかける長さ [フレーム] */
export const FOCUS_FADE_FRAMES = 8;
