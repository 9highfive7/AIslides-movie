import React from 'react';
import { parseMarkup } from '../../shared/markup';

/** **強調** を含むテキストを描画する (アニメーションなし) */
export const RichText: React.FC<{ text: string; strongStyle: React.CSSProperties }> = ({
  text,
  strongStyle,
}) => {
  return (
    <>
      {parseMarkup(text).map((seg, i) =>
        seg.strong ? (
          <span key={i} style={strongStyle}>
            {seg.text}
          </span>
        ) : (
          <React.Fragment key={i}>{seg.text}</React.Fragment>
        ),
      )}
    </>
  );
};
