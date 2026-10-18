import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { script, timeline } from '../data';
import { useTheme } from '../theme';
import { SPRINGS, springFrom } from '../animation/presets';

/**
 * frame 時点の口の開き具合 (0〜1)。
 * npm run audio が音声の音量から1フレームごとに 0〜9 の数字列 (levels) を作っている。
 */
export const mouthOpenAt = (frame: number): number => {
  for (const ts of timeline.scenes) {
    if (frame < ts.startFrame || frame >= ts.startFrame + ts.durationFrames) {
      continue;
    }
    for (const line of ts.lines) {
      const local = frame - line.startFrame;
      if (local < 0 || local >= line.durationFrames) {
        continue;
      }
      if (line.levels.length === 0) {
        // 古い timeline.json 用の代替: 一定のリズムで口を動かす
        return Math.floor(local / 3) % 2 === 0 ? 0.7 : 0.15;
      }
      const at = (i: number) => Number(line.levels[Math.min(line.levels.length - 1, Math.max(0, i))] ?? 0);
      // 隣のフレームと平均してパクパクしすぎないようにする
      return (at(local) * 0.6 + at(local - 1) * 0.4) / 9;
    }
  }
  return 0;
};

/** 右下で喋るキャラクター。meta.avatar 指定時のみ表示 */
export const Avatar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const avatar = script.meta.avatar;
  if (!avatar) {
    return null;
  }

  const open = mouthOpenAt(frame);
  const enter = springFrom(frame, 4, fps, SPRINGS.bouncy);
  const bob = Math.sin(frame / 18) * 3 - open * 6;
  const size = avatar.size;

  return (
    <div
      style={{
        position: 'absolute',
        right: 36,
        bottom: 22,
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `translateY(${(1 - enter) * 260 + bob}px)`,
      }}
    >
      {avatar.type === 'image' && avatar.open && avatar.closed ? (
        <>
          {/* 2枚とも読み込んでおき、表示だけ切り替える (切り替え時のちらつき防止) */}
          <Img
            src={staticFile(avatar.open)}
            style={{ width: size, height: size, objectFit: 'contain', display: open > 0.3 ? 'block' : 'none' }}
          />
          <Img
            src={staticFile(avatar.closed)}
            style={{ width: size, height: size, objectFit: 'contain', display: open > 0.3 ? 'none' : 'block' }}
          />
        </>
      ) : (
        <BuiltinCharacter size={size} open={open} frame={frame} />
      )}
      {avatar.name ? (
        <div
          style={{
            marginTop: -10,
            padding: '4px 16px',
            borderRadius: 999,
            backgroundColor: theme.colors.ink,
            color: theme.colors.bg,
            fontSize: 17,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {avatar.name}
        </div>
      ) : null}
    </div>
  );
};

/** 画像なしで使える組み込みキャラクター (まばたき + 口パク) */
const BuiltinCharacter: React.FC<{ size: number; open: number; frame: number }> = ({ size, open, frame }) => {
  const theme = useTheme();
  // 顔のパーツはテーマに関係なく濃い色で描く (dark テーマでも目と口が見えるように)
  const face = '#1B1B1F';
  // 約3.5秒ごとに 4フレームのまばたき
  const blinkPhase = frame % 104;
  const eyeScale = blinkPhase < 4 ? 0.12 : 1;
  const tilt = Math.sin(frame / 45) * 3;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
      <ellipse cx={100} cy={188} rx={56} ry={8} fill="rgba(0,0,0,0.18)" />
      <g transform={`rotate(${tilt} 100 110)`}>
        {/* アンテナ */}
        <line x1={100} y1={30} x2={100} y2={8} stroke={face} strokeWidth={5} strokeLinecap="round" />
        <circle cx={100} cy={8} r={9} fill={theme.colors.warning} />
        {/* 頭 */}
        <circle cx={100} cy={104} r={76} fill={theme.colors.accent} stroke={face} strokeWidth={5} />
        <ellipse cx={100} cy={116} rx={56} ry={48} fill="#FFFFFF" opacity={0.92} />
        {/* 目 */}
        {[72, 128].map((x) => (
          <g key={x} transform={`translate(${x} 100) scale(1 ${eyeScale})`}>
            <ellipse cx={0} cy={0} rx={10} ry={13} fill={face} />
            <circle cx={3} cy={-5} r={3.5} fill="#FFFFFF" />
          </g>
        ))}
        {/* ほっぺ */}
        <ellipse cx={58} cy={124} rx={10} ry={6} fill="#FF7B8A" opacity={0.55} />
        <ellipse cx={142} cy={124} rx={10} ry={6} fill="#FF7B8A" opacity={0.55} />
        {/* 口 */}
        {open < 0.08 ? (
          <path d="M 86 128 Q 100 140 114 128" stroke={face} strokeWidth={5} fill="none" strokeLinecap="round" />
        ) : (
          <g>
            <ellipse cx={100} cy={132} rx={11 + open * 5} ry={3 + open * 14} fill={face} />
            <ellipse cx={100} cy={134 + open * 8} rx={6 + open * 3} ry={1 + open * 5} fill="#FF7B8A" />
          </g>
        )}
      </g>
    </svg>
  );
};
