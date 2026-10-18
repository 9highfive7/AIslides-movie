import { createContext, useContext, type CSSProperties } from 'react';
import type { ThemeName } from '../schemas';

/**
 * デザイントークン。配色は meta.theme で切り替える。
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
  };
  card: CSSProperties;
  radius: number;
  pattern: 'dots' | 'grid';
  subtitleStyle: 'box' | 'outline';
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
};

export const THEMES: Record<ThemeName, Theme> = { clean, pop, dark };

export const ThemeContext = createContext<Theme>(clean);

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
