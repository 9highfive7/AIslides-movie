import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { parseMarkup } from '../../shared/markup';
import { SPRINGS, springFrom } from '../animation/presets';

/**
 * 1文字ずつ弾むように出てくるテキスト (キネティックタイポグラフィ)。
 * - \n で改行
 * - **強調** は文字が出そろった後に、蛍光ペンのようなマーカーが左から引かれる
 */
export const KineticText: React.FC<{
  text: string;
  at: number;
  /** 1文字あたりの遅れ [フレーム] */
  stagger?: number;
  /** 文字が出てくる距離 (em) */
  rise?: number;
  markerColor: string;
  markerInk?: string;
  /** 'underline': 文字の下半分に引く蛍光ペン / 'block': 文字全体を塗る (濃い背景向け) */
  marker?: 'underline' | 'block';
  style?: React.CSSProperties;
}> = ({ text, at, stagger = 1.5, rise = 0.6, markerColor, markerInk, marker = 'underline', style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = text.split('\n');
  const totalChars = [...text.replace(/\*\*/g, '').replace(/\n/g, '')].length;
  const markerAt = at + totalChars * stagger + 4;
  let charIndex = 0;

  const renderChar = (ch: string, key: string, color?: string) => {
    const p = springFrom(frame, at + charIndex * stagger, fps, SPRINGS.snappy);
    charIndex++;
    const opacity = interpolate(p, [0, 0.5], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <span
        key={key}
        style={{
          display: 'inline-block',
          whiteSpace: 'pre',
          color,
          opacity,
          transform: `translateY(${(1 - p) * rise}em) rotate(${(1 - p) * 8}deg)`,
        }}
      >
        {ch}
      </span>
    );
  };

  return (
    <div style={style}>
      {lines.map((line, li) => (
        <div key={li}>
          {parseMarkup(line).map((seg, si) => {
            if (!seg.strong) {
              const chars = [...seg.text].map((ch, ci) => renderChar(ch, `${li}-${si}-${ci}`));
              return <React.Fragment key={si}>{chars}</React.Fragment>;
            }
            const sweep = springFrom(frame, markerAt + si * 4, fps, SPRINGS.smooth);
            // マーカーが通過した文字から順に強調色へ切り替える
            const segChars = [...seg.text];
            const chars = segChars.map((ch, ci) =>
              renderChar(ch, `${li}-${si}-${ci}`, sweep >= (ci + 0.5) / segChars.length ? markerInk : undefined),
            );
            return (
              <span
                key={si}
                style={{
                  backgroundImage: `linear-gradient(${markerColor}, ${markerColor})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: marker === 'block' ? '0 50%' : '0 88%',
                  backgroundSize: `${sweep * 100}% ${marker === 'block' ? '100%' : '42%'}`,
                  padding: marker === 'block' ? '0 0.12em' : '0 0.08em',
                  borderRadius: marker === 'block' ? '0.08em' : undefined,
                }}
              >
                {chars}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
