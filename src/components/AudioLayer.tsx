import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { timeline } from '../data';

/**
 * ナレーション音声。timeline.json の startFrame に従って
 * 各セリフの WAV を配置する。音声はすべて public/audio 配下。
 */
export const AudioLayer: React.FC = () => {
  return (
    <>
      {timeline.scenes.flatMap((ts) =>
        ts.lines.map((line) => (
          <Sequence key={`${ts.id}-${line.index}`} from={line.startFrame}>
            <Audio src={staticFile(line.audioFile)} />
          </Sequence>
        )),
      )}
    </>
  );
};
