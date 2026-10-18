import React from 'react';
import { useCurrentFrame } from 'remotion';
import { script, sceneOf, timeline } from '../data';
import { useTheme } from '../theme';

/** 画面下端の進行バー。章扉 (section) の位置に区切りを入れる */
export const ProgressBar: React.FC = () => {
  const theme = useTheme();
  const frame = useCurrentFrame();
  if (!script.meta.progressBar) {
    return null;
  }
  const total = timeline.totalFrames;
  const ticks = timeline.scenes
    .filter((ts) => sceneOf(ts.id).layout === 'section' && ts.startFrame > 0)
    .map((ts) => ts.startFrame / total);

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: 'rgba(0,0,0,0.12)' }}>
      <div
        style={{
          width: `${(frame / Math.max(1, total - 1)) * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.accent,
        }}
      />
      {ticks.map((x, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(${x * 100}% - 2px)`,
            top: 0,
            width: 4,
            height: '100%',
            backgroundColor: theme.colors.bg,
          }}
        />
      ))}
    </div>
  );
};
