import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { TRANSITION_HALF_FRAMES } from '../shared/timing';
import { isDarkLayout, script, sceneOf, timeline, transitionOf } from './data';
import { ThemeContext, resolveTheme, useTheme, uses3dStyle } from './themes';
import { ensureFonts } from './fonts';
import { buildSceneContext, SceneProvider } from './context/SceneContext';
import { transitionIn, transitionOut } from './animation/transitions';
import { HeadingChrome } from './components/HeadingChrome';
import { EditorialHeading, RunningHead } from './components/EditorialChrome';
import { SceneChrome } from './components/SceneChrome';
import { SceneBackground } from './components/SceneBackground';
import { Camera } from './components/Camera';
import { SubtitleLayer } from './components/SubtitleLayer';
import { AudioLayer } from './components/AudioLayer';
import { Avatar, avatarRightInset } from './components/Avatar';
import { ProgressBar } from './components/ProgressBar';
import { SubscribePopup } from './components/SubscribePopup';
import { FloatingToys } from './components/FloatingToys';
import { SceneLayoutView } from './layouts';
import { isObjectsScene3D, type Scene, type TimelineScene, type TransitionType } from './schemas';

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
  const theme = useTheme();
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
  const editorial = theme.chrome === 'editorial';
  const { meta } = script;
  const is3d = uses3dStyle(meta);
  // scene3d は three.js のカメラを自前で持つので、画面全体のズームはかけない。
  // objects で並べる形は舞台 (床) の背景も自前で描く
  const isScene3d = scene.layout === 'scene3d';
  const isStage = isScene3d && isObjectsScene3D(scene.content);

  return (
    <AbsoluteFill style={{ ...transitionStyle, overflow: 'hidden' }}>
      <SceneProvider value={ctx}>
        <SceneBackground
          variant={dark && !editorial ? 'dark' : 'light'}
          animated={meta.animatedBackground}
          seed={index}
          mode={isStage ? 'stage' : is3d ? '3d' : 'flat'}
          toys={is3d}
        />
        {is3d && (scene.layout === 'title' || scene.layout === 'section' || scene.layout === 'outro') ? (
          <FloatingToys
            kind={scene.layout}
            shapes={scene.layout === 'outro' ? undefined : scene.content.objects}
            at={ctx.introAt}
          />
        ) : null}
        <Camera enabled={meta.camera === 'subtle' && !dark && !isScene3d} mode={is3d ? '3d' : 'flat'} from={start} to={end}>
          <SceneLayoutView scene={scene} />
        </Camera>
        {editorial ? (
          <>
            {!dark && scene.heading ? <EditorialHeading heading={scene.heading} at={ctx.introAt} /> : null}
            <RunningHead label={meta.header?.label} title={scene.chapter ?? meta.header?.title} />
            <SceneChrome badge={scene.badge} at={ctx.introAt} />
          </>
        ) : (
          <>
            {!dark && (scene.heading || scene.label) ? (
              <HeadingChrome heading={scene.heading ?? ''} label={scene.label} at={ctx.introAt} />
            ) : null}
            {!dark ? <SceneChrome chapter={scene.chapter} badge={scene.badge} at={ctx.introAt} /> : null}
          </>
        )}
      </SceneProvider>
    </AbsoluteFill>
  );
};

export const Slideshow: React.FC = () => {
  const theme = resolveTheme(script.meta);
  ensureFonts(theme.fonts);
  const avatar = script.meta.avatar;

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg, fontFamily: theme.fonts.body, color: theme.colors.ink }}>
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
        <SubtitleLayer rightInset={avatarRightInset(avatar)} />
        <ProgressBar />
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};
