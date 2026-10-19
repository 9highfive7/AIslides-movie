// 図解ムービー スタジオの画面。サーバー (studio/server.ts) に生成を頼み、進み具合を1秒ごとに確かめる。

const $ = (id) => document.getElementById(id);

const state = {
  /** いま開いている動画 (プロジェクト) */
  project: null,
  /** プレビューしている版の番号 */
  version: null,
  /** 修正の対象に選んだ場面ID (null = 動画全体) */
  sceneId: null,
  /** プレビュー中の版の、場面ごとの開始秒 */
  sceneStarts: {},
  status: null,
  pollTimer: null,
};

const api = async (path, options = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
};

const media = (v, file) => `/media/${state.project.id}/${v}/${file}`;

/* ---------- 入力欄 ---------- */

const chosen = (group) => document.querySelector(`.chips[data-group="${group}"] button.on`)?.dataset.value;

document.querySelectorAll('.chips').forEach((chips) => {
  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    renderImageState();
  });
});

/** AIイラストを選んだときだけ、画像生成 AI の準備状況を出す */
const renderImageState = () => {
  const images = state.status?.images;
  $('image-row').hidden = chosen('look') !== 'illust' || !images;
  if (!images) return;
  $('image-state').textContent = images.ready
    ? `● 画像生成 ${images.provider === 'gemini' ? 'Gemini' : 'OpenAI'}（${images.model}）`
    : '● 画像生成 AI 未設定（仮の枠の絵で作ります。GEMINI_API_KEY を設定）';
  $('image-state').className = `voice-state ${images.ready ? 'ok' : 'ng'}`;
};

const formValues = () => ({
  topic: $('topic').value.trim(),
  settings: $('settings').value,
  look: chosen('look'),
  durationSec: Number(chosen('durationSec')),
  speaker: Number($('speaker').value),
});

const startProject = async (body) => {
  try {
    const { id } = await api('/api/projects', { method: 'POST', body: JSON.stringify(body) });
    await openProject(id);
    refreshList();
  } catch (error) {
    alert(error.message);
  }
};

$('generate').addEventListener('click', () => {
  const values = formValues();
  if (!values.topic) {
    $('topic').focus();
    alert('動画のテーマを入力してください');
    return;
  }
  startProject(values);
});

$('import-btn').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async () => {
  const file = $('import-file').files[0];
  $('import-file').value = '';
  if (!file) return;
  try {
    const script = JSON.parse(await file.text());
    startProject({ ...formValues(), topic: $('topic').value.trim() || script?.meta?.title || '', script });
  } catch {
    alert('JSON として読めませんでした。台本ファイルを確認してください。');
  }
});

/* ---------- 動画 (プロジェクト) を開く・進み具合を見る ---------- */

const openProject = async (id) => {
  location.hash = `p=${id}`;
  state.project = await api(`/api/projects/${id}`);
  const p = state.project;
  $('topic').value = p.topic === '(台本から作成)' ? '' : p.topic;
  $('settings').value = p.settings || '';
  const done = [...p.versions].reverse().find((v) => v.status === 'done');
  state.version = done ? done.n : p.versions.at(-1)?.n ?? null;
  state.sceneId = null;
  render();
  poll();
};

const running = () => ['queued', 'running'].includes(state.project?.job?.status);

const poll = () => {
  clearTimeout(state.pollTimer);
  if (!state.project || !running()) return;
  state.pollTimer = setTimeout(async () => {
    const before = state.project.job?.status;
    try {
      state.project = await api(`/api/projects/${state.project.id}`);
    } catch {
      // サーバーが一時的に応答しなくても、次の確認で追いつく
    }
    const job = state.project.job;
    if (before !== job?.status && job?.status === 'done') {
      state.version = job.version;
      state.sceneId = null;
      refreshList();
    }
    render();
    poll();
  }, 1000);
};

/* ---------- 描画 ---------- */

const fmtTime = (sec) => {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${s}秒`;
};

const renderProgress = () => {
  const job = state.project?.job;
  const card = $('progress-card');
  const v = state.project?.versions.find((x) => x.n === state.version);
  if (!job && !v) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  if (!job) {
    // 以前に作った版を開いたとき
    $('stage').textContent = v.status === 'done' ? '生成が終わりました' : v.status === 'error' ? 'エラーで止まりました' : '生成待ち';
    $('pct').textContent = v.status === 'done' ? '100%' : '';
    $('bar').style.width = v.status === 'done' ? '100%' : '0';
    $('time').textContent = v.status === 'done' ? `所要時間 ${fmtTime(v.elapsedSec)} ・ ${fmtTime(v.durationSec)}の動画${mockNote(v)}` : '';
    $('steps').innerHTML = '';
    $('error').hidden = !v.error;
    $('error').textContent = v.error || '';
    return;
  }
  $('stage').textContent = job.stage;
  $('pct').textContent = `${Math.floor(job.percent)}%`;
  $('bar').style.width = `${job.percent}%`;
  const elapsed = (Date.now() - job.startedAt) / 1000;
  $('time').textContent =
    job.status === 'done'
      ? `所要時間 ${fmtTime(elapsed)}`
      : job.status === 'error'
        ? ''
        : `${job.etaSec != null ? `残り 約${fmtTime(job.etaSec)} ／ ` : ''}経過 ${fmtTime(elapsed)}`;
  $('steps').innerHTML = job.steps
    .map(
      (s, i) =>
        `<div class="step ${s.state}"><span class="dot">${s.state === 'done' ? '✓' : s.state === 'run' ? '' : i + 1}</span>${s.label}<span class="t">${escapeHtml(s.detail || '')}</span></div>`,
    )
    .join('');
  $('error').hidden = job.status !== 'error';
  $('error').textContent = job.error || '';
};

/** 仮の音声・仮の絵で作った版の注記 */
const mockNote = (v) => [v.mockAudio ? '無音の仮音声' : '', v.mockImages ? '仮の絵あり' : ''].filter(Boolean).map((t) => `（${t}）`).join('');

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const renderPreview = () => {
  const p = state.project;
  const video = $('video');
  const still = $('still');
  const overlay = $('overlay');
  const tag = $('tag');
  $('video-title').textContent = p ? p.title || p.topic : '動画を作ると、ここで見られます';

  // 版の切り替え
  $('versions').innerHTML = (p?.versions || [])
    .map((v) => `<button type="button" data-v="${v.n}" class="${v.n === state.version ? 'on' : ''} ${v.status === 'error' ? 'err' : ''}" title="${escapeHtml(v.instruction || (v.kind === 'import' ? '台本から作成' : '最初の版'))}">v${v.n}</button>`)
    .join('');

  const job = p?.job;
  const v = p?.versions.find((x) => x.n === state.version);
  const generatingThis = running() && job.version === state.version;
  const scenes = generatingThis ? job.scenes : v?.scenes || [];
  const ready = (s) => (generatingThis ? s.ready : s.thumb);

  // 場面の一覧 (クリックで修正の対象に選ぶ・その場面へ移動)
  $('scenes').innerHTML = scenes
    .map((s, i) => {
      const img = ready(s) ? `<img src="${media(state.version, `scenes/${s.id}.png`)}?t=${generatingThis ? Date.now() >> 12 : v?.n}" alt="">` : `<div class="ph">${generatingThis ? '描画待ち' : '—'}</div>`;
      return `<button type="button" class="sc ${state.sceneId === s.id ? 'sel' : ''} ${ready(s) ? '' : 'wait'}" data-scene="${s.id}">${img}<span>${i + 1}. ${escapeHtml(s.label)}</span></button>`;
    })
    .join('');

  if (v?.hasVideo && !generatingThis) {
    const src = media(v.n, 'video.mp4');
    if (!video.src.endsWith(src)) {
      video.poster = media(v.n, 'thumbnail.png');
      video.src = src;
      loadSceneStarts(v.n);
    }
    video.hidden = false;
    still.hidden = true;
    overlay.hidden = true;
    tag.hidden = false;
    tag.textContent = `完成版 v${v.n}${mockNote(v)}`;
    return;
  }
  video.pause();
  video.removeAttribute('src');
  video.hidden = true;
  const lastReady = [...scenes].reverse().find(ready);
  still.hidden = !lastReady;
  if (lastReady) still.src = `${media(state.version, `scenes/${lastReady.id}.png`)}?t=${Date.now() >> 12}`;
  overlay.hidden = false;
  tag.hidden = !generatingThis;
  tag.textContent = '下書き';
  if (generatingThis) {
    const n = scenes.filter(ready).length;
    $('overlay-big').textContent = job.status === 'queued' ? '順番を待っています' : 'プレビューを準備しています';
    $('overlay-sub').textContent = scenes.length ? `できた場面から先に見られます（${n} / ${scenes.length} 場面）` : job.stage;
  } else if (v?.status === 'error') {
    $('overlay-big').textContent = 'この版は作れませんでした';
    $('overlay-sub').textContent = '左のエラーを確認して、もう一度試してください';
  } else {
    $('overlay-big').textContent = 'まだ動画がありません';
    $('overlay-sub').textContent = '左でテーマを入れて「動画を生成」を押してください';
  }
};

const loadSceneStarts = async (n) => {
  state.sceneStarts = {};
  try {
    const timeline = await (await fetch(media(n, 'timeline.json'))).json();
    for (const s of timeline.scenes) state.sceneStarts[s.id] = s.startFrame / timeline.fps;
  } catch {
    // タイムラインがなくても、場面の選択はできる
  }
};

const renderActions = () => {
  const p = state.project;
  const v = p?.versions.find((x) => x.n === state.version);
  const isBusy = running();
  $('generate').disabled = isBusy;
  $('generate').classList.toggle('busy', isBusy);
  $('generate').textContent = isBusy ? '生成中…' : '▶ 動画を生成';

  const canRevise = !isBusy && p?.versions.some((x) => x.status === 'done' || x.scenes?.length);
  $('fix-card').classList.toggle('disabled-card', !canRevise);
  $('instruction').disabled = !canRevise;
  $('revise').disabled = !canRevise;
  const label = state.sceneId ? (v?.scenes || []).findIndex((s) => s.id === state.sceneId) : -1;
  $('target').textContent = state.sceneId && label >= 0 ? `${label + 1}. ${v.scenes[label].label}` : '動画全体';
  $('target-clear').hidden = !state.sceneId;

  const hasVideo = Boolean(v?.hasVideo) && !(isBusy && p.job.version === v.n);
  $('save-card').classList.toggle('disabled-card', !hasVideo);
  const links = { 'dl-video': 'video.mp4', 'dl-thumb': 'thumbnail.png', 'dl-desc': 'youtube/description.txt', 'dl-srt': 'youtube/captions.srt', 'dl-script': 'script.json' };
  for (const [id, file] of Object.entries(links)) {
    const a = $(id);
    a.classList.toggle('disabled', !hasVideo);
    if (hasVideo) a.href = `${media(v.n, file)}?download=1`;
    else a.removeAttribute('href');
  }
};

const render = () => {
  renderProgress();
  renderPreview();
  renderActions();
};

/* ---------- 版の切り替え・場面の選択・修正 ---------- */

$('versions').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-v]');
  if (!btn) return;
  state.version = Number(btn.dataset.v);
  state.sceneId = null;
  render();
});

$('scenes').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-scene]');
  if (!btn || btn.classList.contains('wait')) return;
  const id = btn.dataset.scene;
  state.sceneId = state.sceneId === id ? null : id;
  const start = state.sceneStarts[id];
  if (state.sceneId && start != null && !$('video').hidden) $('video').currentTime = start + 0.05;
  render();
});

$('target-clear').addEventListener('click', () => {
  state.sceneId = null;
  render();
});

$('revise').addEventListener('click', async () => {
  const instruction = $('instruction').value.trim();
  if (!instruction) {
    $('instruction').focus();
    return;
  }
  try {
    await api(`/api/projects/${state.project.id}/revise`, {
      method: 'POST',
      body: JSON.stringify({ instruction, sceneId: state.sceneId }),
    });
    $('instruction').value = '';
    await openProject(state.project.id);
    const job = state.project.job;
    if (job) state.version = job.version;
    render();
  } catch (error) {
    alert(error.message);
  }
});

/* ---------- ヘッダー: 新しい動画 / 作った動画 ---------- */

$('nav-new').addEventListener('click', () => {
  clearTimeout(state.pollTimer);
  state.project = null;
  state.version = null;
  state.sceneId = null;
  history.replaceState(null, '', location.pathname);
  $('topic').value = '';
  $('settings').value = '';
  render();
  $('topic').focus();
});

const refreshList = async () => {
  const list = await api('/api/projects').catch(() => []);
  $('list-count').textContent = list.length;
  $('project-list').innerHTML = list.length
    ? list
        .map((p) => {
          const thumb = p.thumbVersion ? `<img src="/media/${p.id}/${p.thumbVersion}/thumbnail.png" alt="">` : '<div class="ph"></div>';
          const status = { done: '完成', running: '生成中', queued: '順番待ち', error: 'エラー' }[p.status] || '';
          return `<button type="button" class="pj" data-id="${p.id}">${thumb}<div><b>${escapeHtml(p.title)}</b><small>${new Date(p.createdAt).toLocaleString('ja-JP')} ・ v${p.version} ${status}</small></div></button>`;
        })
        .join('')
    : '<p style="color:var(--faint)">まだありません</p>';
};

$('nav-list').addEventListener('click', () => {
  refreshList();
  $('drawer').hidden = false;
});
$('drawer-close').addEventListener('click', () => ($('drawer').hidden = true));
$('drawer').addEventListener('click', (e) => {
  if (e.target === $('drawer')) $('drawer').hidden = true;
  const btn = e.target.closest('.pj');
  if (btn) {
    $('drawer').hidden = true;
    openProject(btn.dataset.id);
  }
});

/* ---------- 起動 ---------- */

const showStatus = async () => {
  try {
    state.status = await api('/api/status');
  } catch {
    return;
  }
  const { llm, voice } = state.status;
  const notes = [];
  if (!llm.ready) {
    notes.push(
      llm.provider === 'claude'
        ? '台本を書く AI (Claude) の APIキーが見つかりません。ANTHROPIC_API_KEY を設定してから `npm run studio` を起動し直してください（`ant auth login` 済みならそのまま動くこともあります）。\n台本（JSON）を読み込んで作ることはできます。'
        : '台本を書く AI の APIキーが見つかりません。OPENAI_API_KEY を設定してください。',
    );
  }
  $('notice').hidden = notes.length === 0;
  $('notice').textContent = notes.join('\n');
  $('voice-state').textContent = voice.alive ? '● VOICEVOX 接続中' : '● VOICEVOX 未起動（無音の仮音声で作ります）';
  $('voice-state').className = `voice-state ${voice.alive ? 'ok' : 'ng'}`;
  renderImageState();
};

showStatus();
refreshList();
const fromHash = /p=([a-z0-9-]+)/.exec(location.hash);
if (fromHash) openProject(fromHash[1]).catch(() => render());
else render();
