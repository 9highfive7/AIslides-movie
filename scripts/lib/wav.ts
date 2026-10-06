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
