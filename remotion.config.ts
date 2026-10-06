import os from 'node:os';
import { Config } from '@remotion/cli/config';

// 画像形式 (jpeg) とコーデック (h264) は Remotion の既定値を使用。
Config.setOverwriteOutput(true);

// 同時実行数をメモリとコア数から自動算出する。
// レンダリングの1タブあたり約1.2GBのメモリを見込み、低メモリ環境での
// クラッシュを防ぐ。手動で変えたい場合は --concurrency で上書きできる。
const byMemory = Math.max(1, Math.floor(os.totalmem() / (1.2 * 1024 ** 3)));
const byCores = Math.max(1, Math.floor(os.cpus().length / 2));
Config.setConcurrency(Math.min(8, byMemory, byCores));
