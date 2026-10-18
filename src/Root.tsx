import React from 'react';
import { Composition, Still } from 'remotion';
import { timeline } from './data';
import { Slideshow } from './Slideshow';
import { Thumbnail } from './Thumbnail';
import { FPS } from '../shared/timing';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Slideshow"
        component={Slideshow}
        /* 総尺は timeline.json (音声の実寸秒から算出) に基づき自動で決まる */
        durationInFrames={1}
        calculateMetadata={() => ({
          durationInFrames: timeline.totalFrames,
        })}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* YouTube サムネイル (npm run thumbnail) */}
      <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    </>
  );
};
