import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { parseMarkup } from '../shared/markup';
import { script } from './data';
import { FONT_FAMILY, THEMES, ThemeContext } from './theme';
import { ensureFonts } from './fonts';
import { SceneBackground } from './components/SceneBackground';

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

/**
 * YouTube サムネイル (1280×720)。npm run thumbnail で out/thumbnail.png に書き出す。
 * 太い縁取り文字 + **強調** の色替えで、小さく表示されても読める。
 */
export const Thumbnail: React.FC = () => {
  ensureFonts();
  const theme = THEMES[script.meta.theme];
  const thumb = resolveThumbnail();
  const lines = thumb.text.split('\n');
  const longest = Math.max(...lines.map((l) => [...l.replace(/\*\*/g, '')].length), 1);
  const fontSize = Math.min(150, Math.floor(1100 / longest), Math.floor(480 / lines.length));

  return (
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill style={{ fontFamily: FONT_FAMILY, backgroundColor: theme.colors.darkBg, overflow: 'hidden' }}>
        <SceneBackground variant="dark" animated={false} seed={3} />
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
            bottom: 70,
            height: 26,
            backgroundColor: theme.colors.onDarkAccent,
            transform: 'rotate(-2.5deg)',
          }}
        />
        {thumb.badge ? (
          <div
            style={{
              position: 'absolute',
              top: 44,
              left: 50,
              padding: '10px 28px',
              borderRadius: 12,
              backgroundColor: theme.colors.warning,
              color: '#FFFFFF',
              fontSize: 40,
              fontWeight: 900,
              transform: 'rotate(-4deg)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            }}
          >
            {thumb.badge}
          </div>
        ) : null}
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px 70px 110px',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize,
                fontWeight: 900,
                lineHeight: 1.18,
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: '0.01em',
                textShadow: `${outline('#111111', 10)}, 0 14px 30px rgba(0,0,0,0.5)`,
              }}
            >
              {parseMarkup(line).map((seg, j) => (
                <span key={j} style={seg.strong ? { color: theme.name === 'pop' ? '#FFD60A' : theme.colors.onDarkAccent } : undefined}>
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
                fontSize: 40,
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
