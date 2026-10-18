import fs from 'node:fs';

/**
 * WAV (PCM) のヘッダをたどって実寸秒を返す。
 * VOICEVOX の出力 (24000Hz / 16bit / mono) と generate-audio の無音WAVの両方に対応。
 */
export const readWavDuration = (buf: Buffer): number => {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('WAV ではないファイルです');
  }
  let offset = 12; // RIFF ヘッダ直後からチャンクを走査
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      byteRate = buf.readUInt32LE(offset + 16);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2); // チャンクは2バイト境界
  }
  if (byteRate <= 0 || dataSize <= 0) {
    throw new Error('WAV の解析に失敗しました (fmt/data チャンクが見つかりません)');
  }
  return dataSize / byteRate;
};

/** 指定秒数の無音 WAV (16bit / mono / 24000Hz) を書き出す (モック用) */
export const writeSilentWav = (filePath: string, seconds: number, sampleRate = 24000): void => {
  const numSamples = Math.max(1, Math.round(seconds * sampleRate));
  const dataSize = numSamples * 2; // 16bit mono
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt チャンクサイズ
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byteRate
  header.writeUInt16LE(2, 32); // blockAlign
  header.writeUInt16LE(16, 34); // bitsPerSample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, Buffer.alloc(dataSize)]));
};

/** 16bit PCM の WAV をモノラルの浮動小数 (-1〜1) に読み込む (口パク用の音量計算に使う) */
export const readWavPcm = (buf: Buffer): { sampleRate: number; samples: Float32Array } => {
  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let bits = 16;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bits = buf.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      if (bits !== 16) {
        throw new Error(`16bit 以外の WAV には対応していません (${bits}bit)`);
      }
      const start = offset + 8;
      const end = Math.min(buf.length, start + chunkSize);
      const frames = Math.floor((end - start) / (2 * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          sum += buf.readInt16LE(start + (i * channels + c) * 2);
        }
        samples[i] = sum / channels / 32768;
      }
      return { sampleRate, samples };
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error('WAV の解析に失敗しました (data チャンクが見つかりません)');
};

/** モノラルの浮動小数 (-1〜1) を 16bit PCM の WAV として書き出す */
export const writeWav = (filePath: string, samples: Float32Array, sampleRate: number): void => {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
};
