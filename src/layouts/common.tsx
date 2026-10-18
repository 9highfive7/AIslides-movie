import React from 'react';
import { PAGE } from '../themes';
import type { Scene } from '../schemas';

export type ContentOf<L extends Scene['layout']> = Extract<Scene, { layout: L }>['content'];
export type SceneOf<L extends Scene['layout']> = Extract<Scene, { layout: L }>;

/** 見出しの下〜字幕の上のコンテンツ領域 */
export const ContentArea: React.FC<{
  bottom?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ bottom = 220, style, children }) => (
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
