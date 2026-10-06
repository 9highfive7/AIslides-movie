import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { script, timeline } from './data';
import { COLORS, FONT_FAMILY, CROSSFADE_FRAMES } from './theme';
import { ensureFonts } from './fonts';
import { HeadingChrome } from './components/HeadingChrome';
import { SubtitleLayer } from './components/SubtitleLayer';
import { AudioLayer } from './components/AudioLayer';
import { TitleLayout } from './layouts/TitleLayout';
import { CompareLayout } from './layouts/CompareLayout';
import { FlowLayout } from './layouts/FlowLayout';
import { InputOutputLayout } from './layouts/InputOutputLayout';
import { BulletsLayout } from './layouts/BulletsLayout';
import { StatsLayout } from './layouts/StatsLayout';
import { SectionLayout } from './layouts/SectionLayout';
import { TableLayout } from './layouts/TableLayout';
import { BarsLayout } from './layouts/BarsLayout';
import { ChecklistLayout } from './layouts/ChecklistLayout';
import { AxesLayout } from './layouts/AxesLayout';
import { SceneChrome } from './components/SceneChrome';
import type { Scene, TimelineScene } from './schemas';

/** 要素IDが最初に reveal されるフレーム。未指定 (常に表示) の場合は null */
export type RevealAt = (elementId: string) => number | null;

const sceneOpacity = (frame: number, ts: TimelineScene): number => {
  // 短いクロスフェード: 背景色の上でシーン全体がフェードイン/アウトする
  const fadeIn = interpolate(
    frame,
    [ts.startFrame, ts.startFrame + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const fadeOut = interpolate(
    frame,
    [ts.startFrame + ts.durationFrames - CROSSFADE_FRAMES, ts.startFrame + ts.durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return Math.min(fadeIn, fadeOut);
};

const SceneView: React.FC<{ scene: Scene; ts: TimelineScene }> = ({ scene, ts }) => {
  const frame = useCurrentFrame();

  const revealAt: RevealAt = (elementId) => {
    for (const line of ts.lines) {
      if (line.reveal.includes(elementId)) {
        return line.startFrame;
      }
    }
    return null; // reveal に書かれない要素はシーン開始から常時表示
  };

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, ts) }}>
      {scene.layout === 'title' || scene.layout === 'section' ? (
        <>
          <AbsoluteFill style={{ backgroundColor: COLORS.ink }} />
          {scene.layout === 'title' ? (
            <TitleLayout scene={scene} />
          ) : (
            <SectionLayout scene={scene} />
          )}
        </>
      ) : (
        <>
          <HeadingChrome heading={scene.heading ?? ''} label={scene.label} />
          <SceneChrome chapter={scene.chapter} badge={scene.badge} />
          {scene.layout === 'compare' ? (
            <CompareLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'flow' ? (
            <FlowLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'inputOutput' ? (
            <InputOutputLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'bullets' ? (
            <BulletsLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'stats' ? (
            <StatsLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'table' ? (
            <TableLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'bars' ? (
            <BarsLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'checklist' ? (
            <ChecklistLayout content={scene.content} revealAt={revealAt} />
          ) : null}
          {scene.layout === 'axes' ? (
            <AxesLayout content={scene.content} revealAt={revealAt} />
          ) : null}
        </>
      )}
    </AbsoluteFill>
  );
};

export const Slideshow: React.FC = () => {
  ensureFonts();

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.bg, fontFamily: FONT_FAMILY, color: COLORS.ink }}
    >
      {timeline.scenes.map((ts) => {
        const scene = script.scenes.find((s) => s.id === ts.id);
        if (!scene) {
          throw new Error(
            `timeline.json にシーン "${ts.id}" がありますが、script.json に対応するシーンがありません。\n` +
              '台本を変更した場合は npm run audio を再実行してください。',
          );
        }
        return <SceneView key={ts.id} scene={scene} ts={ts} />;
      })}
      {/* ナレーション音声 (各lineの startFrame から再生) */}
      <AudioLayer />
      {/* 字幕はシーンのフェードとは独立したレイヤー */}
      <SubtitleLayer />
    </AbsoluteFill>
  );
};
