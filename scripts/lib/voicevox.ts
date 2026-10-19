import fs from 'node:fs';
import path from 'node:path';

export interface VoicevoxConfig {
  endpoint: string;
  speakerId: number;
  speedScale: number;
}

/** voicevox.config.json を読む。存在しない場合はデフォルト値を使う。VOICEVOX_SPEAKER / VOICEVOX_SPEED / VOICEVOX_ENDPOINT で上書きできる */
export const loadVoicevoxConfig = (configPath: string): VoicevoxConfig => {
  const defaults: VoicevoxConfig = {
    endpoint: 'http://localhost:50021',
    speakerId: 3,
    speedScale: 1.0,
  };
  const raw = fs.existsSync(configPath) ? (JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<VoicevoxConfig>) : {};
  // 環境変数での上書き (動画生成アプリが動画ごとに声を選ぶのに使う)
  const env: Partial<VoicevoxConfig> = {
    ...(process.env.VOICEVOX_SPEAKER ? { speakerId: Number(process.env.VOICEVOX_SPEAKER) } : null),
    ...(process.env.VOICEVOX_SPEED ? { speedScale: Number(process.env.VOICEVOX_SPEED) } : null),
    ...(process.env.VOICEVOX_ENDPOINT ? { endpoint: process.env.VOICEVOX_ENDPOINT } : null),
  };
  return { ...defaults, ...raw, ...env };
};

/** エンジンが起動していなければ、起動方法を案内して例外を投げる */
export const assertEngineAlive = async (config: VoicevoxConfig): Promise<void> => {
  try {
    const res = await fetch(`${config.endpoint}/version`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    throw new Error(
      `VOICEVOX Engine に接続できません (${config.endpoint})。\n` +
        'エンジンを起動してから再度実行してください。起動例 (Windows の cmd / PowerShell も同じコマンド):\n' +
        '  docker run -d --rm --name voicevox -p 127.0.0.1:50021:50021 voicevox/voicevox_engine:cpu-latest\n' +
        '起動の確認: curl http://localhost:50021/version\n' +
        'エンジンなしでタイミングだけ確認する場合: npm run audio:mock',
    );
  }
};

/** audio_query → synthesis の2段階で WAV を取得する */
export const synthesize = async (opts: {
  endpoint: string;
  speakerId: number;
  speedScale: number;
  text: string;
}): Promise<Buffer> => {
  const { endpoint, speakerId, speedScale, text } = opts;

  const queryUrl = `${endpoint}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
  const queryRes = await fetch(queryUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
  });
  if (!queryRes.ok) {
    throw new Error(`VOICEVOX /audio_query が失敗しました: HTTP ${queryRes.status} (text: ${text.slice(0, 30)}…)`);
  }
  const query = (await queryRes.json()) as Record<string, unknown>;
  query.speedScale = speedScale;

  const synthRes = await fetch(`${endpoint}/synthesis?speaker=${speakerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(120000),
  });
  if (!synthRes.ok) {
    throw new Error(`VOICEVOX /synthesis が失敗しました: HTTP ${synthRes.status} (text: ${text.slice(0, 30)}…)`);
  }
  return Buffer.from(await synthRes.arrayBuffer());
};
