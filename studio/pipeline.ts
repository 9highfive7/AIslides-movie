/**
 * 動画を1本 (1つの版) 作る流れ:
 *   1. 台本      AI に書かせる (修正のときは前の版の台本を直させる)
 *   2. ナレーション  VOICEVOX で音声を作る (起動していなければ無音の仮音声)
 *   3. 字幕のタイミング  音声の長さからタイムラインを計算する (2 と同時に終わる)
 *   4. 3D・図解の描画  Remotion で場面ごとの静止画 → 全フレームを描く
 *   5. 書き出し   MP4 にまとめ、サムネイルと YouTube 用ファイルを作る
 *
 * Remotion は public/script.json などを読み込んで動画を組み立てるので、
 * 生成中だけ public/ を書き換え、組み立て (bundle) が終わったらすぐ元に戻す。同時に動く生成は1つだけ。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { scriptSchema, timelineSchema, type ScriptConfig } from '../src/schemas';
import { stripMarkup } from '../shared/markup';
import { loadVoicevoxConfig } from '../scripts/lib/voicevox';
import { reviseScript, validateScript, writeScript, type Audience } from '../scripts/lib/script-writer';
import { buildChapters, buildDescription, buildSrt } from '../scripts/lib/youtube';
import { ROOT, loadProject, saveProject, versionDir, type Look, type Project, type ProjectOptions } from './store';

const PUBLIC = path.join(ROOT, 'public');

export type StepKey = 'script' | 'voice' | 'timing' | 'draw' | 'export';

export interface Step {
  key: StepKey;
  label: string;
  state: 'wait' | 'run' | 'done';
  detail: string;
}

export interface JobState {
  projectId: string;
  version: number;
  status: 'queued' | 'running' | 'done' | 'error';
  /** 全体の進み具合 0〜100 */
  percent: number;
  /** いま何をしているか (進捗カードの見出し) */
  stage: string;
  steps: Step[];
  startedAt: number;
  etaSec: number | null;
  scenes: { id: string; label: string; ready: boolean }[];
  error?: string;
}

export type JobRequest =
  | { kind: 'create'; topic: string; settings: string; options: ProjectOptions }
  | { kind: 'import'; script: unknown; options: ProjectOptions }
  | { kind: 'revise'; instruction: string; sceneId: string | null };

const newSteps = (): Step[] => [
  { key: 'script', label: '台本とリサーチ', state: 'wait', detail: '' },
  { key: 'voice', label: 'ナレーション', state: 'wait', detail: '' },
  { key: 'timing', label: '字幕のタイミング', state: 'wait', detail: '' },
  { key: 'draw', label: '3D・図解の描画', state: 'wait', detail: '' },
  { key: 'export', label: '書き出し（MP4）', state: 'wait', detail: '' },
];

/** 全体の進み具合のうち、各工程が占める範囲 [%] */
const RANGE: Record<StepKey, [number, number]> = {
  script: [0, 10],
  voice: [10, 20],
  timing: [20, 21],
  draw: [21, 90],
  export: [90, 100],
};

/** 場面の一覧に出す短い名前 */
export const sceneLabel = (scene: ScriptConfig['scenes'][number]): string => {
  const c = scene.content as Record<string, unknown>;
  const raw =
    scene.heading ??
    (typeof c.title === 'string' ? c.title : null) ??
    (typeof c.text === 'string' ? c.text : null) ??
    stripMarkup(scene.lines[0]?.text ?? scene.id);
  const text = stripMarkup(String(raw)).replace(/\n/g, ' ').trim();
  return [...text].length > 16 ? `${[...text].slice(0, 15).join('')}…` : text;
};

/** キッズは小学生向けのやさしい言葉 + 3D オブジェクト中心、それ以外は大人向けの解説で書く */
const audienceOf = (look: Look): Audience => (look === 'kids' ? 'kids' : 'general');

/** 見た目の選択を台本の meta に反映する (新規作成のときだけ)。3D図解は paper テーマで描く */
const applyLook = (script: ScriptConfig, options: ProjectOptions): ScriptConfig => {
  const editorial = options.look === 'paper' || options.look === 'zukai3d';
  const meta = { ...script.meta, theme: editorial ? 'paper' : options.look };
  if (editorial) {
    Object.assign(meta, {
      transition: 'fade',
      avatar: false,
      progressBar: false,
      subtitle: { ...meta.subtitle, style: 'box' },
      sfx: { ...meta.sfx, reveal: false, transition: false, volume: 0.35 },
      header: meta.header ?? {
        label: options.look === 'zukai3d' ? '3D図解' : '図解',
        title: meta.title ? [...meta.title].slice(0, 20).join('') : undefined,
      },
    });
  }
  return scriptSchema.parse({ ...script, meta });
};

const buildMaterial = (topic: string, settings: string, options: ProjectOptions): string =>
  [
    '次の依頼内容から台本を作成します。',
    '-----',
    `## 動画のテーマ\n${topic}`,
    settings.trim() ? `## 細かい設定\n${settings}` : '',
    `## 目安の尺\n約${options.durationSec}秒 (ナレーションは全体で約${Math.round(options.durationSec * 6)}字。1秒あたり約6字)`,
    options.look === 'paper'
      ? '## 見た目\n図解ドキュメンタリー風 (紙・紺×朱×墨・明朝)。題材に合う 3D の場面 (scene3d) があれば使い、なければ statement / stats / share / bars / flow などの図解で見せる。title / outro シーンは使わない。'
      : '',
    options.look === 'zukai3d'
      ? '## 見た目\n図解ドキュメンタリー風 (紙・紺×朱×墨・明朝) の 3D 図解。自販機の透視図のように、題材の物そのもの (機械・建物・道具・体・地形など) を scene3d の「組み立て (parts)」形式で作り込んで見せる。内容のシーンの半分以上を parts 形式の scene3d にし、外箱を ghost で透かして中の部品を見せる・目に見えない流れ (熱・電気・水・データ・お金) を flows で流す・callouts で部位を指して説明する・数の多さは repeat で並べる。説明の順に部品や流れを reveal し、組み立てていくように見せる。題材に合う preset があればそれも使ってよい。それ以外のシーンは statement / stats / share / bars / flow などの図解で見せる。title / outro シーンは使わない。'
      : '',
    '数字には必ず出典を付け、不確かな数字は「約」「およそ」を付けるか使わない。',
    '-----',
  ]
    .filter(Boolean)
    .join('\n\n');

const copyDir = (from: string, to: string): void => {
  fs.rmSync(to, { recursive: true, force: true });
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
  }
};

/** public/ の台本・タイムライン・音声を一時的に退避し、あとで元に戻す */
const backupPublic = (): (() => void) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-public-'));
  for (const f of ['script.json', 'timeline.json']) {
    if (fs.existsSync(path.join(PUBLIC, f))) {
      fs.copyFileSync(path.join(PUBLIC, f), path.join(dir, f));
    }
  }
  copyDir(path.join(PUBLIC, 'audio'), path.join(dir, 'audio'));
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const f of ['script.json', 'timeline.json']) {
      const saved = path.join(dir, f);
      if (fs.existsSync(saved)) {
        fs.copyFileSync(saved, path.join(PUBLIC, f));
      } else {
        fs.rmSync(path.join(PUBLIC, f), { force: true });
      }
    }
    copyDir(path.join(dir, 'audio'), path.join(PUBLIC, 'audio'));
    fs.rmSync(dir, { recursive: true, force: true });
  };
};

const voicevoxAlive = async (endpoint: string): Promise<boolean> => {
  try {
    const res = await fetch(`${endpoint}/version`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
};

export const voiceStatus = async (): Promise<{ engine: string; alive: boolean }> => {
  const cfg = loadVoicevoxConfig(path.join(ROOT, 'voicevox.config.json'));
  return { engine: 'VOICEVOX', alive: await voicevoxAlive(cfg.endpoint) };
};

/** scripts/generate-audio.ts を子プロセスで動かし、1セリフごとに進み具合を知らせる */
const runAudio = (mock: boolean, speaker: number, onLine: () => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const tsx = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    const child = spawn(tsx, ['scripts/generate-audio.ts', ...(mock ? ['--mock'] : [])], {
      cwd: ROOT,
      env: { ...process.env, VOICEVOX_SPEAKER: String(speaker) },
      shell: process.platform === 'win32',
    });
    let log = '';
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      log += text;
      for (const line of text.split('\n')) {
        if (/\] line \d+:/.test(line)) onLine();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`音声の生成に失敗しました:\n${log.slice(-1500)}`))));
  });

/** WebGL (3D の場面) の描画方法。GPU のない Linux ではソフトウェア描画にする */
const chromium = () => ({
  gl: (process.env.STUDIO_GL as 'swangle' | 'angle' | 'egl' | 'swiftshader' | undefined) ?? (process.platform === 'linux' ? 'swangle' : undefined),
});
const browserExecutable = process.env.STUDIO_BROWSER ?? null;

export const runJob = async (job: JobState, request: JobRequest, update: () => void): Promise<void> => {
  const project = loadProject(job.projectId) as Project;
  const vInfo = project.versions.find((v) => v.n === job.version);
  if (!vInfo) throw new Error('版が見つかりません');
  const outDir = versionDir(project.id, job.version);
  fs.mkdirSync(outDir, { recursive: true });

  const step = (key: StepKey) => job.steps.find((s) => s.key === key) as Step;
  const enter = (key: StepKey, stage: string, detail = '') => {
    for (const s of job.steps) {
      if (s.state === 'run') s.state = 'done';
    }
    Object.assign(step(key), { state: 'run', detail });
    job.stage = stage;
    job.percent = Math.max(job.percent, RANGE[key][0]);
    update();
  };
  const progress = (key: StepKey, ratio: number) => {
    const [a, b] = RANGE[key];
    job.percent = Math.max(job.percent, Math.round((a + (b - a) * Math.min(1, ratio)) * 10) / 10);
    update();
  };

  job.status = 'running';
  vInfo.status = 'running';
  saveProject(project);

  // 1. 台本
  enter('script', '台本を書いています', request.kind === 'revise' ? '前の版を修正' : request.kind === 'import' ? '読み込んだ台本' : '');
  let script: ScriptConfig;
  if (request.kind === 'create') {
    const material = buildMaterial(request.topic, request.settings, request.options);
    script = applyLook(await writeScript(material, (m) => (step('script').detail = m), audienceOf(request.options.look)), request.options);
  } else if (request.kind === 'import') {
    const checked = validateScript(request.script);
    if (!checked.data) throw new Error(`台本の形式が不正です:\n${checked.problems.join('\n')}`);
    script = checked.data;
  } else {
    // 直前の版から順にさかのぼり、台本がある版を元にする (途中で失敗した版は飛ばす)
    const base = [...project.versions]
      .reverse()
      .map((v) => path.join(versionDir(project.id, v.n), 'script.json'))
      .find((f) => fs.existsSync(f));
    if (!base) throw new Error('修正の元になる台本がありません');
    const prev = JSON.parse(fs.readFileSync(base, 'utf8')) as unknown;
    script = await reviseScript(
      scriptSchema.parse(prev),
      request.instruction,
      request.sceneId,
      (m) => (step('script').detail = m),
      audienceOf(project.options.look),
    );
  }
  fs.writeFileSync(path.join(outDir, 'script.json'), JSON.stringify(script, null, 2) + '\n');
  project.title = script.meta.title ?? project.title;
  saveProject(project);
  job.scenes = script.scenes.map((s) => ({ id: s.id, label: sceneLabel(s), ready: false }));
  step('script').detail = `${script.scenes.length}場面 / ${script.scenes.reduce((n, s) => n + s.lines.length, 0)}セリフ`;
  progress('script', 1);

  const restorePublic = backupPublic();
  let serveUrl: string | null = null;
  const browser = { current: null as Awaited<ReturnType<typeof openBrowser>> | null };
  try {
    // 2. ナレーション
    const voice = await voiceStatus();
    const mock = !voice.alive;
    enter('voice', 'ナレーションを作っています', mock ? 'VOICEVOX 未起動 → 無音の仮音声' : 'VOICEVOX');
    fs.writeFileSync(path.join(PUBLIC, 'script.json'), JSON.stringify(script, null, 2) + '\n');
    const totalLines = script.scenes.reduce((n, s) => n + s.lines.length, 0);
    let doneLines = 0;
    await runAudio(mock, project.options.speaker, () => progress('voice', ++doneLines / totalLines));
    fs.copyFileSync(path.join(PUBLIC, 'timeline.json'), path.join(outDir, 'timeline.json'));
    copyDir(path.join(PUBLIC, 'audio'), path.join(outDir, 'audio'));
    vInfo.mockAudio = mock;

    // 3. 字幕のタイミング (タイムラインは音声と同時にできている)
    const timeline = timelineSchema.parse(JSON.parse(fs.readFileSync(path.join(outDir, 'timeline.json'), 'utf8')));
    vInfo.durationSec = Math.round((timeline.totalFrames / timeline.fps) * 10) / 10;
    enter('timing', '字幕のタイミングを合わせています', `${vInfo.durationSec}秒`);
    progress('timing', 1);

    // 4. 3D・図解の描画
    enter('draw', '動画を組み立てています', '準備中');
    serveUrl = await bundle({
      entryPoint: path.join(ROOT, 'src', 'index.ts'),
      rootDir: ROOT,
      publicDir: PUBLIC,
      onProgress: (p) => progress('draw', (p / 100) * 0.06),
    });
    // 組み立てた中に台本・音声が入ったので、public/ はもう元に戻してよい
    restorePublic();

    browser.current = await openBrowser('chrome', { browserExecutable, chromiumOptions: chromium() });
    const common = { serveUrl, browserExecutable, chromiumOptions: chromium(), puppeteerInstance: browser.current, logLevel: 'error' as const };
    const composition = await selectComposition({ ...common, id: 'Slideshow' });

    // 場面ごとの静止画 (できた場面から先に見られるように)
    job.stage = '場面の下絵を描いています';
    fs.mkdirSync(path.join(outDir, 'scenes'), { recursive: true });
    for (const [i, ts] of timeline.scenes.entries()) {
      const last = ts.lines[ts.lines.length - 1];
      const frame = Math.min(ts.startFrame + ts.durationFrames - 12, last.startFrame + 50);
      await renderStill({ ...common, composition, frame, scale: 0.3, output: path.join(outDir, 'scenes', `${ts.id}.png`) });
      const scene = job.scenes.find((s) => s.id === ts.id);
      if (scene) scene.ready = true;
      step('draw').detail = `下絵 ${i + 1} / ${timeline.scenes.length} 場面`;
      progress('draw', 0.06 + 0.14 * ((i + 1) / timeline.scenes.length));
    }

    job.stage = '3D・図解を描いています';
    const total = composition.durationInFrames;
    const renderStart = Date.now();
    let exportStarted = false;
    await renderMedia({
      ...common,
      composition,
      codec: 'h264',
      outputLocation: path.join(outDir, 'video.mp4'),
      concurrency: Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2))),
      onProgress: ({ renderedFrames, encodedFrames }) => {
        step('draw').detail = `${renderedFrames} / ${total} フレーム`;
        progress('draw', 0.2 + 0.8 * (renderedFrames / total));
        const elapsed = (Date.now() - renderStart) / 1000;
        job.etaSec = renderedFrames > 10 ? Math.round(((total - renderedFrames) * elapsed) / renderedFrames + 15) : null;
        if (renderedFrames >= total && !exportStarted) {
          exportStarted = true;
          enter('export', '書き出しています', 'MP4 にまとめています');
        }
        if (exportStarted) progress('export', 0.7 * (encodedFrames / total));
      },
    });
    if (!exportStarted) enter('export', '書き出しています');

    // 5. 書き出し: サムネイルと YouTube 用ファイル
    step('export').detail = 'サムネイル・概要欄';
    const thumb = await selectComposition({ ...common, id: 'Thumbnail' });
    await renderStill({ ...common, composition: thumb, output: path.join(outDir, 'thumbnail.png') });
    const yt = path.join(outDir, 'youtube');
    fs.mkdirSync(yt, { recursive: true });
    const { chapters } = buildChapters(script, timeline);
    fs.writeFileSync(path.join(yt, 'description.txt'), buildDescription(script, chapters));
    fs.writeFileSync(path.join(yt, 'captions.srt'), buildSrt(timeline));

    for (const s of job.steps) s.state = 'done';
    step('export').detail = '完了';
    job.percent = 100;
    job.etaSec = null;
    job.stage = '生成が終わりました';
    job.status = 'done';
    vInfo.status = 'done';
    vInfo.elapsedSec = Math.round((Date.now() - job.startedAt) / 1000);
    saveProject(project);
    update();
  } finally {
    restorePublic();
    await browser.current?.close({ silent: true }).catch(() => undefined);
    if (serveUrl) fs.rmSync(serveUrl, { recursive: true, force: true });
  }
};

/* ---------- 生成の順番待ち (同時に動くのは1つだけ) ---------- */

const jobs = new Map<string, JobState>();
const queue: { job: JobState; request: JobRequest }[] = [];
let running: JobState | null = null;

export const jobOf = (projectId: string): JobState | null => jobs.get(projectId) ?? null;
export const busy = (): boolean => running !== null || queue.length > 0;

const pump = async (): Promise<void> => {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = next.job;
  try {
    await runJob(next.job, next.request, () => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[studio] ${next.job.projectId} v${next.job.version}: ${message}`);
    next.job.status = 'error';
    next.job.error = message;
    next.job.stage = 'エラーで止まりました';
    const project = loadProject(next.job.projectId);
    const v = project?.versions.find((x) => x.n === next.job.version);
    if (project && v) {
      v.status = 'error';
      v.error = message;
      saveProject(project);
    }
  } finally {
    running = null;
    void pump();
  }
};

export const enqueue = (project: Project, request: JobRequest): JobState => {
  const n = (project.versions.at(-1)?.n ?? 0) + 1;
  project.versions.push({
    n,
    createdAt: new Date().toISOString(),
    kind: request.kind,
    ...(request.kind === 'revise' ? { instruction: request.instruction, sceneId: request.sceneId } : null),
    status: 'queued',
  });
  saveProject(project);
  const job: JobState = {
    projectId: project.id,
    version: n,
    status: 'queued',
    percent: 0,
    stage: busy() ? '順番を待っています' : '準備しています',
    steps: newSteps(),
    startedAt: Date.now(),
    etaSec: null,
    scenes: [],
  };
  jobs.set(project.id, job);
  queue.push({ job, request });
  void pump();
  return job;
};
