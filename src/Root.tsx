import React from 'react';
import { Composition, Still } from 'remotion';
import { timeline } from './data';
import { Slideshow } from './Slideshow';
import { Thumbnail } from './Thumbnail';
import { ShapeCatalog } from './ShapeCatalog';
import { SHORTS } from './stage';
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
      {/* YouTube ショート (縦 9:16)。同じ台本を縦の割り付けで描く (npm run render:shorts) */}
      <Composition
        id="Shorts"
        component={Slideshow}
        durationInFrames={1}
        calculateMetadata={() => ({
          durationInFrames: timeline.totalFrames,
        })}
        fps={FPS}
        width={SHORTS.width}
        height={SHORTS.height}
      />
      {/* YouTube サムネイル (npm run thumbnail) */}
      <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
      {/* ショートのカバー画像 (縦 1080×1920。npm run cover:shorts) */}
      <Still id="ShortsCover" component={Thumbnail} width={SHORTS.width} height={SHORTS.height} />
      {/* scene3d で使える 3D オブジェクトの一覧 (台本を書くときの見本) */}
      <Still id="ShapeCatalog" component={ShapeCatalog} width={1920} height={1080} />
    </>
  );
};
