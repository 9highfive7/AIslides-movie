import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TRANSITION_HALF_FRAMES } from '../shared/timing';
import { isDarkLayout, script, sceneOf, timeline, transitionOf } from './data';
import { FONT_FAMILY, THEMES, ThemeContext } from './theme';
import { ensureFonts } from './fonts';
import { buildSceneContext, SceneProvider } from './context/SceneContext';
import { transitionIn, transitionOut } from './animation/transitions';
import { HeadingChrome } from './components/HeadingChrome';
import { SceneChrome } from './components/SceneChrome';
import { SceneBackground } from './components/SceneBackground';
import { Camera } from './components/Camera';
import { SubtitleLayer } from './components/SubtitleLayer';
import { AudioLayer } from './components/AudioLayer';
import { Avatar } from './components/Avatar';
import { ProgressBar } from './components/ProgressBar';
import { SubscribePopup } from './components/SubscribePopup';
import { SceneLayoutView } from './layouts';
import type { Scene, TimelineScene, TransitionType } from './schemas';

const H = TRANSITION_HALF_FRAMES;

/**
 * 1シーン分。シーン境界の前後 H フレームずつ前後のシーンと重なり、
 * その間に入る側/出る側のトランジションを再生する。
 */
const SceneView: React.FC<{
  scene: Scene;
  ts: TimelineScene;
  index: number;
  inType: TransitionType | null;
  outType: TransitionType | null;
}> = ({ scene, ts, index, inType, outType }) => {
  const frame = useCurrentFrame();
  const ctx = useMemo(() => buildSceneContext(scene, ts, script.meta), [scene, ts]);

  const start = ts.startFrame;
  const end = ts.startFrame + ts.durationFrames;
  const visibleFrom = inType ? start - H : start;
  const visibleTo = outType ? end + H : end;
  if (frame < visibleFrom || frame >= visibleTo) {
    return null;
  }

  let transitionStyle: React.CSSProperties = {};
  if (inType && frame < start + H) {
    transitionStyle = transitionIn(inType, (frame - (start - H)) / (2 * H));
  } else if (outType && frame >= end - H) {
    transitionStyle = transitionOut(outType, (frame - (end - H)) / (2 * H));
  }

  const dark = isDarkLayout(scene.layout);
  const { meta } = script;

  return (
    <AbsoluteFill style={{ ...transitionStyle, overflow: 'hidden' }}>
      <SceneProvider value={ctx}>
        <SceneBackground variant={dark ? 'dark' : 'light'} animated={meta.animatedBackground} seed={index} />
        <Camera enabled={meta.camera === 'subtle' && !dark} from={start} to={end}>
          <SceneLayoutView scene={scene} />
        </Camera>
        {!dark && (scene.heading || scene.label) ? (
          <HeadingChrome heading={scene.heading ?? ''} label={scene.label} at={ctx.introAt} />
        ) : null}
        {!dark ? <SceneChrome chapter={scene.chapter} badge={scene.badge} at={ctx.introAt} /> : null}
      </SceneProvider>
    </AbsoluteFill>
  );
};

export const Slideshow: React.FC = () => {
  ensureFonts();
  const theme = THEMES[script.meta.theme];
  const avatar = script.meta.avatar;

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: FONT_FAMILY, color: theme.colors.ink }}>
        {timeline.scenes.map((ts, i) => {
          const scene = sceneOf(ts.id);
          const next = timeline.scenes[i + 1];
          const inType = i > 0 ? transitionOf(scene) : null;
          const outType = next ? transitionOf(sceneOf(next.id)) : null;
          return (
            <SceneView
              key={ts.id}
              scene={scene}
              ts={ts}
              index={i}
              inType={inType === 'none' ? null : inType}
              outType={outType === 'none' ? null : outType}
            />
          );
        })}
        <AudioLayer />
        <SubscribePopup />
        <Avatar />
        {/* 字幕はシーンのトランジションとは独立したレイヤー */}
        <SubtitleLayer rightInset={avatar ? avatar.size * 0.85 + 40 : 0} />
        <ProgressBar />
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};
