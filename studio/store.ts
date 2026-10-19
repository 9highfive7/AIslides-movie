/**
 * 動画生成アプリの保存先。1本の動画 = 1つのプロジェクト。修正するたびに版 (v1, v2, ...) が増える。
 *
 *   studio-data/projects/<id>/project.json      テーマ・設定・版の一覧
 *   studio-data/projects/<id>/v<n>/script.json  その版の台本
 *                                  timeline.json, audio/   音声とタイミング (修正時に引き継ぐ)
 *                                  video.mp4, thumbnail.png (縦の動画ではショートのカバー 1080×1920), scenes/<シーンID>.png
 *                                  youtube/description.txt, captions.srt, tags.txt, upload.txt, metadata.json
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT, 'studio-data', 'projects');

/**
 * 見た目。zukai3d は paper テーマで、部品を組み立てた作り込みの 3D 図解 (自販機の場面のような) を中心にする。
 * illust は paper テーマで、画像生成 AI の絵 (背景・物) を重ねる場面 (layered) を中心にする
 */
export type Look = 'paper' | 'zukai3d' | 'illust' | 'kids' | 'pop' | 'clean' | 'dark';

/** 動画の形式。landscape: 横 16:9 (ふつうの動画) / vertical: 縦 9:16 (YouTube ショート) */
export type VideoFormat = 'landscape' | 'vertical';

export interface ProjectOptions {
  look: Look;
  /** 動画の形式 (省略時は横。この項目ができる前のプロジェクトも横) */
  format?: VideoFormat;
  /** 目安の尺 [秒] */
  durationSec: number;
  /** VOICEVOX の話者ID */
  speaker: number;
  /** BGM (public/bgm/ のファイル名)。なしなら省略 */
  bgm?: string;
}

export interface VersionInfo {
  n: number;
  createdAt: string;
  kind: 'create' | 'import' | 'revise';
  instruction?: string;
  sceneId?: string | null;
  status: 'queued' | 'running' | 'done' | 'error';
  error?: string;
  durationSec?: number;
  /** VOICEVOX が使えず、無音の仮音声で作った */
  mockAudio?: boolean;
  /** 画像生成 AI が使えない・失敗したため、仮の枠の絵がある */
  mockImages?: boolean;
  /** 生成にかかった時間 [秒] */
  elapsedSec?: number;
}

export interface Project {
  id: string;
  createdAt: string;
  topic: string;
  settings: string;
  options: ProjectOptions;
  title?: string;
  versions: VersionInfo[];
}

const projectDir = (id: string): string => {
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('プロジェクトIDが不正です');
  }
  return path.join(DATA_DIR, id);
};

export const versionDir = (id: string, n: number): string => path.join(projectDir(id), `v${n}`);

export const newProjectId = (): string => {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
};

export const saveProject = (project: Project): void => {
  const dir = projectDir(project.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'project.json');
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(project, null, 2));
  fs.renameSync(`${file}.tmp`, file);
};

export const loadProject = (id: string): Project | null => {
  const file = path.join(projectDir(id), 'project.json');
  if (!fs.existsSync(file)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Project;
};

export const listProjects = (): Project[] => {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }
  return fs
    .readdirSync(DATA_DIR)
    .map((id) => {
      try {
        return loadProject(id);
      } catch {
        return null;
      }
    })
    .filter((p): p is Project => p !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** 保存先の中のファイルだけを返す (../ などで外に出られないようにする) */
export const safeProjectFile = (id: string, n: number, rel: string): string | null => {
  const base = versionDir(id, n);
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    return null;
  }
  return full;
};
