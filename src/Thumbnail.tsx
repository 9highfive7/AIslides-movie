import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { parseMarkup } from '../shared/markup';
import { script } from './data';
import { ThreeCanvas } from '@remotion/three';
import { ThemeContext, resolveTheme, uses3dStyle } from './themes';
import { ensureFonts } from './fonts';
import { SceneBackground } from './components/SceneBackground';
import { DEFAULT_FLOATING } from './three/catalog';
import { ShapeModel } from './three/models';
import { ToyLights } from './three/toon';

/** サムネイルの文言: meta.thumbnail → 最初の title シーン → meta.title の順に探す */
const resolveThumbnail = () => {
  const { thumbnail, title } = script.meta;
  if (thumbnail) {
    return thumbnail;
  }
  const titleScene = script.scenes.find((scene) => scene.layout === 'title');
  if (titleScene && titleScene.layout === 'title') {
    return { text: titleScene.content.title, sub: titleScene.content.subtitle, badge: titleScene.content.kicker, image: undefined };
  }
  return { text: title ?? '', sub: undefined, badge: undefined, image: undefined };
};

const outline = (color: string, width: number): string =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `${(Math.cos(a) * width).toFixed(1)}px ${(Math.sin(a) * width).toFixed(1)}px 0 ${color}`;
  }).join(', ');

/** サムネイルに置く 3D オブジェクトの位置 (x, y, 傾き)。文字とキャラクターを避けた右上と左下 */
const THUMB_SPOTS: Array<[number, number, number]> = [
  [5.5, 2.6, -0.3],
  [-5.6, -2.3, 0.35],
  [-3.6, -2.75, -0.2],
];
/** ショートのカバー (縦) では、文字の上と下に置く */
const COVER_SPOTS: Array<[number, number, number]> = [
  [1.3, 4.6, -0.3],
  [-1.5, -4.4, 0.35],
  [1.4, -5.0, -0.2],
];

/** style: "3d" のとき、タイトルシーンの objects (なければ既定の形) をサムネイルに浮かべる */
const ThumbnailToys: React.FC = () => {
  const titleScene = script.scenes.find((scene) => scene.layout === 'title');
  const objects = titleScene && titleScene.layout === 'title' ? titleScene.content.objects : undefined;
  const { width, height } = useVideoConfig();
  const cover = height > width;
  const spots = cover ? COVER_SPOTS : THUMB_SPOTS;
  const shapes = (objects && objects.length > 0 ? objects : DEFAULT_FLOATING.title).slice(0, spots.length);
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} flat gl={{ antialias: true }} camera={{ fov: cover ? 52 : 30, position: [0, 0, 14] }}>
        <ToyLights />
        {shapes.map((shape, i) => {
          const [x, y, tilt] = spots[i];
          return (
            <group key={i} position={[x, y, 0]} rotation={[0.15, tilt, tilt * 0.4]} scale={i === 0 ? 1.1 : 0.9}>
              <group position={[0, -0.8, 0]}>
                <ShapeModel shape={shape} />
              </group>
            </group>
          );
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/**
 * YouTube サムネイル (1280×720)。npm run thumbnail で out/thumbnail.png に書き出す。
 * 太い縁取り文字 + **強調** の色替えで、小さく表示されても読める。
 * ショートのカバー (ShortsCover・縦 1080×1920) も同じ部品で描く。文字はショートの一覧で切り抜かれても
 * 読めるよう、画面の中央 (上下の UI にかからない高さ) にまとめる
 */
export const Thumbnail: React.FC = () => {
  const theme = resolveTheme(script.meta);
  ensureFonts(theme.fonts);
  // editorial なテーマ (paper) は紙の上に墨文字。縁取りはせず明朝で見せる
  const editorial = theme.chrome === 'editorial';
  const thumb = resolveThumbnail();
  const lines = thumb.text.split('\n');
  const longest = Math.max(...lines.map((l) => [...l.replace(/\*\*/g, '')].length), 1);
  // キャラクター画像があれば右下に大きく置き、文字はその分左に寄せる
  const avatar = script.meta.avatar;
  const character = avatar && avatar.type === 'image' ? avatar.open : null;
  const { width, height } = useVideoConfig();
  const cover = height > width;
  const textWidth = cover ? 900 : character ? 820 : 1100;
  const fontSize = cover
    ? Math.min(170, Math.floor(textWidth / longest), Math.floor(760 / lines.length))
    : Math.min(150, Math.floor(textWidth / longest), Math.floor(480 / lines.length));

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ fontFamily: theme.fonts.body, backgroundColor: theme.colors.darkBg, overflow: 'hidden' }}>
        <SceneBackground variant={editorial ? 'light' : 'dark'} animated={false} seed={3} />
        {uses3dStyle(script.meta) && !thumb.image ? <ThumbnailToys /> : null}
        {thumb.image ? (
          <>
            <Img src={staticFile(thumb.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
          </>
        ) : null}
        {/* 斜めのアクセント帯 */}
        <div
          style={{
            position: 'absolute',
            left: -100,
            right: -100,
            bottom: cover ? 470 : 70,
            height: 26,
            backgroundColor: theme.colors.onDarkAccent,
            transform: 'rotate(-2.5deg)',
          }}
        />
        {thumb.badge ? (
          <div
            style={{
              position: 'absolute',
              top: cover ? 330 : 44,
              left: cover ? 70 : 50,
              padding: '10px 28px',
              borderRadius: 12,
              backgroundColor: theme.colors.warning,
              color: '#FFFFFF',
              fontSize: cover ? 52 : 40,
              fontWeight: 900,
              transform: 'rotate(-4deg)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            }}
          >
            {thumb.badge}
          </div>
        ) : null}
        {character && !cover ? (
          <Img
            src={staticFile(character)}
            style={{
              position: 'absolute',
              right: 10,
              bottom: -30,
              height: 560,
              filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))',
            }}
          />
        ) : null}
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: cover ? '420px 90px 520px' : character ? '60px 400px 110px 50px' : '60px 70px 110px',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize,
                fontFamily: theme.fonts.display,
                fontWeight: 900,
                lineHeight: 1.18,
                color: editorial ? theme.colors.ink : '#FFFFFF',
                textAlign: 'center',
                letterSpacing: '0.01em',
                textShadow: editorial ? undefined : `${outline('#111111', 10)}, 0 14px 30px rgba(0,0,0,0.5)`,
              }}
            >
              {parseMarkup(line).map((seg, j) => (
                <span key={j} style={seg.strong ? { color: theme.name === 'pop' ? '#FFD60A' : editorial ? theme.colors.warning : theme.colors.onDarkAccent } : undefined}>
                  {seg.text}
                </span>
              ))}
            </div>
          ))}
          {thumb.sub ? (
            <div
              style={{
                marginTop: 26,
                padding: '10px 30px',
                borderRadius: 12,
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: '#FFFFFF',
                fontSize: cover ? 50 : 40,
                fontWeight: 800,
                textAlign: 'center',
              }}
            >
              {thumb.sub}
            </div>
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};
