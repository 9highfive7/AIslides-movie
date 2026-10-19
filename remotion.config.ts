import os from 'node:os';
import { Config } from '@remotion/cli/config';

Config.setOverwriteOutput(true);

// YouTube の推奨に合わせた書き出し (H.264 / yuv420p / BT.709 / AAC 320kbps)。
// 動画生成アプリ (studio/pipeline.ts) は scripts/lib/finish.ts の YOUTUBE_RENDER で同じ設定を使う
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setX264Preset('medium');
Config.setAudioBitrate('320k');

// 同時実行数をメモリとコア数から自動算出する。
// レンダリングの1タブあたり約1.2GBのメモリを見込み、低メモリ環境での
// クラッシュを防ぐ。手動で変えたい場合は --concurrency で上書きできる。
const byMemory = Math.max(1, Math.floor(os.totalmem() / (1.2 * 1024 ** 3)));
const byCores = Math.max(1, Math.floor(os.cpus().length / 2));
Config.setConcurrency(Math.min(8, byMemory, byCores));
