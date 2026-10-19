import React from 'react';
import { PAGE } from '../themes';
import { SHORTS, SHORTS_AREA, useVertical } from '../stage';
import type { Scene } from '../schemas';

export type ContentOf<L extends Scene['layout']> = Extract<Scene, { layout: L }>['content'];
export type SceneOf<L extends Scene['layout']> = Extract<Scene, { layout: L }>;

/**
 * 縦の動画 (ショート) の図解の領域。見出しの下〜字幕の上・右のボタンにかからない範囲に置き、
 * 中身は SHORTS_AREA の大きさで並べてから SHORTS.scale 倍に拡大する (横の動画と同じ部品が、スマホで読める大きさになる)。
 * style の top / bottom は横の動画向けの位置なので使わない
 */
export const ShortsArea: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => {
  const { top: _top, bottom: _bottom, ...rest } = style ?? {};
  return (
    <div
      style={{
        position: 'absolute',
        left: SHORTS.safe.left,
        top: SHORTS.content.top,
        width: SHORTS_AREA.width * SHORTS.scale,
        height: SHORTS_AREA.height * SHORTS.scale,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: SHORTS_AREA.width,
          height: SHORTS_AREA.height,
          transform: `scale(${SHORTS.scale})`,
          transformOrigin: '0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...rest,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** 見出しの下〜字幕の上のコンテンツ領域 */
export const ContentArea: React.FC<{
  bottom?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ bottom = 220, style, children }) => {
  const vertical = useVertical();
  if (vertical) {
    return <ShortsArea style={style}>{children}</ShortsArea>;
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: PAGE.paddingX,
        right: PAGE.paddingX,
        top: PAGE.contentTop,
        bottom,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
