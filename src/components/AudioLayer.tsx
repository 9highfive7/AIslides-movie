import React from 'react';
import { Audio, Sequence, interpolate, staticFile } from 'remotion';
import { script, timeline } from '../data';
import { SFX_GAIN, collectSfxEvents, narrationWeight } from '../audio-events';

/** 効果音ファイルの長さ (scripts/lib/sfx.ts で生成する尺に合わせて少し余裕を持たせる) */
const SFX_FRAMES = 36;

/**
 * 音声レイヤー。
 * - ナレーション: timeline.json の startFrame に従って各セリフの WAV を配置
 * - 効果音: 要素の出現 (pop)・シーン切り替え (whoosh)・登録ボタン (click)
 * - BGM: meta.bgm 指定時。ループ再生し、ナレーション中は自動で音量を下げる
 */
export const AudioLayer: React.FC = () => {
  const { sfx, bgm } = script.meta;
  const events = collectSfxEvents();
  const total = timeline.totalFrames;

  return (
    <>
      {timeline.scenes.flatMap((ts) =>
        ts.lines.map((line) => (
          <Sequence key={`${ts.id}-${line.index}`} from={line.startFrame} durationInFrames={line.durationFrames + 6}>
            <Audio src={staticFile(line.audioFile)} />
          </Sequence>
        )),
      )}
      {events.map((event, i) => (
        <Sequence key={`sfx-${i}`} from={event.frame} durationInFrames={SFX_FRAMES}>
          <Audio src={staticFile(`sfx/${event.name}.wav`)} volume={SFX_GAIN[event.name] * sfx.volume} />
        </Sequence>
      ))}
      {bgm ? (
        <Audio
          src={bgm.src.startsWith('http') ? bgm.src : staticFile(bgm.src)}
          loop
          volume={(f) => {
            const level = interpolate(narrationWeight(f), [0, 1], [bgm.volume, bgm.duckVolume]);
            const fade = interpolate(f, [0, 30, total - 60, total], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return level * fade;
          }}
        />
      ) : null}
    </>
  );
};
