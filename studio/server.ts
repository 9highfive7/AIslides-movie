/**
 * 図解ムービー スタジオ: テーマを入れるだけで解説動画を作るローカルアプリ。
 *
 *   npm run studio   → http://localhost:4300 をブラウザで開く
 *
 * 画面 (studio/public/) と、生成の受付・進み具合・動画の配信をする小さな HTTP サーバー。
 * 外部には公開せず、このPCからだけ使う (127.0.0.1 で待ち受ける)。
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { scriptProvider } from '../scripts/lib/script-writer';
import { resolveImageProvider } from '../scripts/lib/image-gen';
import { busy, enqueue, jobOf, listBgm, sceneLabel, voiceStatus } from './pipeline';
import { listProjects, loadProject, newProjectId, safeProjectFile, saveProject, versionDir, type Look, type Project } from './store';
import { scriptSchema } from '../src/schemas';

const PORT = Number(process.env.STUDIO_PORT ?? 4300);
const STATIC_DIR = path.join(__dirname, 'public');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
};

const sendJson = (res: http.ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const readBody = (req: http.IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString();
      if (raw.length > 5_000_000) reject(new Error('送られたデータが大きすぎます'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('JSON の形式が不正です'));
      }
    });
    req.on('error', reject);
  });

/** 動画のシークに必要な Range 指定に対応してファイルを返す */
const sendFile = (req: http.IncomingMessage, res: http.ServerResponse, file: string, downloadName?: string): void => {
  const size = fs.statSync(file).size;
  const headers: http.OutgoingHttpHeaders = {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  };
  if (downloadName) {
    headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`;
  }
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range && !downloadName) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  fs.createReadStream(file).pipe(res);
};

const LOOKS: Look[] = ['paper', 'zukai3d', 'illust', 'kids', 'pop', 'clean', 'dark'];

const parseOptions = (body: Record<string, unknown>) => ({
  look: LOOKS.includes(body.look as Look) ? (body.look as Look) : 'paper',
  durationSec: [60, 90, 180, 300].includes(Number(body.durationSec)) ? Number(body.durationSec) : 90,
  speaker: Number.isInteger(Number(body.speaker)) ? Number(body.speaker) : 3,
  ...(typeof body.bgm === 'string' && listBgm().includes(body.bgm) ? { bgm: body.bgm } : null),
});

/** 画面に渡すプロジェクトの情報 (版ごとの場面一覧つき) */
const projectView = (project: Project) => ({
  ...project,
  versions: project.versions.map((v) => {
    const scriptFile = path.join(versionDir(project.id, v.n), 'script.json');
    let scenes: { id: string; label: string; thumb: boolean }[] = [];
    if (fs.existsSync(scriptFile)) {
      const parsed = scriptSchema.safeParse(JSON.parse(fs.readFileSync(scriptFile, 'utf8')));
      if (parsed.success) {
        scenes = parsed.data.scenes.map((s) => ({
          id: s.id,
          label: sceneLabel(s),
          thumb: fs.existsSync(path.join(versionDir(project.id, v.n), 'scenes', `${s.id}.png`)),
        }));
      }
    }
    return { ...v, scenes, hasVideo: fs.existsSync(path.join(versionDir(project.id, v.n), 'video.mp4')) };
  }),
  job: jobOf(project.id),
});

const safeName = (title: string): string => title.replace(/[\\/:*?"<>|\n]/g, '').slice(0, 40) || 'video';

const handle = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts[0] === 'api') {
    // GET /api/status — 台本を書く AI と声の準備状況
    if (parts[1] === 'status' && req.method === 'GET') {
      const llm = scriptProvider();
      sendJson(res, 200, {
        llm: {
          ...llm,
          ready:
            llm.provider === 'openai'
              ? Boolean(process.env.OPENAI_API_KEY)
              : Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
        },
        voice: await voiceStatus(),
        bgm: listBgm(),
        images: (() => {
          const p = resolveImageProvider();
          return p ? { provider: p.provider, model: p.model, ready: true } : { provider: null, model: null, ready: false };
        })(),
        busy: busy(),
      });
      return;
    }
    if (parts[1] === 'projects') {
      // GET /api/projects — 作った動画の一覧
      if (parts.length === 2 && req.method === 'GET') {
        sendJson(
          res,
          200,
          listProjects().map((p) => {
            const last = p.versions.at(-1);
            const done = [...p.versions].reverse().find((v) => v.status === 'done');
            return { id: p.id, title: p.title ?? p.topic, topic: p.topic, createdAt: p.createdAt, status: last?.status, version: last?.n, thumbVersion: done?.n ?? null };
          }),
        );
        return;
      }
      // POST /api/projects — 新しい動画を作る (テーマから / 台本 JSON から)
      if (parts.length === 2 && req.method === 'POST') {
        const body = await readBody(req);
        const options = parseOptions(body);
        const topic = String(body.topic ?? '').trim();
        const settings = String(body.settings ?? '');
        const imported = body.script;
        if (!topic && imported === undefined) {
          sendJson(res, 400, { error: '動画のテーマを入力してください' });
          return;
        }
        const project: Project = {
          id: newProjectId(),
          createdAt: new Date().toISOString(),
          topic: topic || '(台本から作成)',
          settings,
          options,
          versions: [],
        };
        saveProject(project);
        enqueue(project, imported !== undefined ? { kind: 'import', script: imported, options } : { kind: 'create', topic, settings, options });
        sendJson(res, 200, { id: project.id });
        return;
      }
      const project = parts[2] ? loadProject(parts[2]) : null;
      if (!project) {
        sendJson(res, 404, { error: '動画が見つかりません' });
        return;
      }
      // GET /api/projects/:id — 版の一覧と、生成中なら進み具合
      if (parts.length === 3 && req.method === 'GET') {
        sendJson(res, 200, projectView(project));
        return;
      }
      // POST /api/projects/:id/revise — 修正の指示で新しい版を作る
      if (parts[3] === 'revise' && req.method === 'POST') {
        const body = await readBody(req);
        const instruction = String(body.instruction ?? '').trim();
        if (!instruction) {
          sendJson(res, 400, { error: '修正の指示を入力してください' });
          return;
        }
        if (!project.versions.some((v) => fs.existsSync(path.join(versionDir(project.id, v.n), 'script.json')))) {
          sendJson(res, 400, { error: '修正できる台本がまだありません' });
          return;
        }
        enqueue(project, { kind: 'revise', instruction, sceneId: body.sceneId ? String(body.sceneId) : null });
        sendJson(res, 200, { ok: true });
        return;
      }
    }
    sendJson(res, 404, { error: 'not found' });
    return;
  }

  // GET /media/:id/:version/<file>  (?download=1 で保存用の名前を付けて返す)
  if (parts[0] === 'media' && parts.length >= 4) {
    const file = safeProjectFile(parts[1], Number(parts[2]), parts.slice(3).join('/'));
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    const project = loadProject(parts[1]);
    const download = url.searchParams.get('download')
      ? `${safeName(project?.title ?? project?.topic ?? 'video')}_v${parts[2]}${parts.length > 4 ? `_${path.basename(file)}` : path.extname(file)}`
      : undefined;
    sendFile(req, res, file, download);
    return;
  }

  // 画面 (index.html / app.js / style.css) と、プレビュー用のフォント
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const fontMatch = /^fonts\/([\w-]+\.ttf)$/.exec(rel);
  const file = fontMatch ? path.join(__dirname, '..', 'public', 'fonts', fontMatch[1]) : path.resolve(STATIC_DIR, rel);
  if ((fontMatch || file.startsWith(STATIC_DIR + path.sep)) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    sendFile(req, res, file);
    return;
  }
  res.writeHead(404).end('not found');
};

http
  .createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      console.error('[studio]', error);
      if (!res.headersSent) sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`\n図解ムービー スタジオを起動しました → http://localhost:${PORT}\n(終了は Ctrl+C)\n`);
  });
