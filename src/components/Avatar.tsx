import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { script, timeline } from '../data';
import { useTheme } from '../themes';

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

type AvatarConfig = Exclude<typeof script.meta.avatar, false>;

/** 顔だけを丸い枠で見せるか (画像のキャラクターで framing: face のとき) */
const isFaceFrame = (avatar: AvatarConfig): boolean => avatar.type === 'image' && avatar.framing === 'face';

/** 表示する大きさ [px]。顔の丸い枠は直径 220、全身・builtin は高さ 250 が既定 */
const avatarSize = (avatar: AvatarConfig): number => avatar.size ?? (isFaceFrame(avatar) ? 220 : 250);

/** 顔の丸い枠の、画面の右端・下端からの位置 [px] */
const FACE_MARGIN = { right: 44, bottom: 40 };

/** 字幕がキャラクターに重ならないよう、画面の右端からあける幅 [px] */
export const avatarRightInset = (avatar: AvatarConfig | false): number => {
  if (!avatar) {
    return 0;
  }
  const size = avatarSize(avatar);
  return isFaceFrame(avatar) ? FACE_MARGIN.right + size + 28 : size * 0.85 + 40;
};

/**
 * 右下で喋るキャラクター。meta.avatar が false のときは表示しない。
 * 体や顔は動かさず、口の形 (画像の切り替え) だけが音声に合わせて変わる。
 */
export const Avatar: React.FC = () => {
  const frame = useCurrentFrame();
  const avatar = script.meta.avatar;
  if (!avatar) {
    return null;
  }

  const open = mouthOpenAt(frame);
  const size = avatarSize(avatar);
  // 動画の冒頭だけ、その場でふわっと現れる (位置は動かさない)
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const face = isFaceFrame(avatar);

  return (
    <div
      style={{
        position: 'absolute',
        right: face ? FACE_MARGIN.right : 36,
        bottom: face ? FACE_MARGIN.bottom : 22,
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
      }}
    >
      {avatar.type === 'builtin' ? (
        <BuiltinCharacter size={size} open={open} />
      ) : face ? (
        <FaceWindow avatar={avatar} open={open} size={size} />
      ) : (
        <MouthImages avatar={avatar} open={open} style={{ width: size, height: size, objectFit: 'contain' }} />
      )}
      {avatar.name ? <NameTag name={avatar.name} /> : null}
    </div>
  );
};

const NameTag: React.FC<{ name: string }> = ({ name }) => {
  const theme = useTheme();
  return (
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
        position: 'relative',
      }}
    >
      {name}
    </div>
  );
};

/**
 * 顔だけを丸い枠 (ワイプ) で見せる。画像を拡大して face の位置を枠の中心に合わせる。
 * 画像は口以外が同じなので、切り替えても動くのは口だけ。
 */
const FaceWindow: React.FC<{ avatar: AvatarConfig; open: number; size: number }> = ({ avatar, open, size }) => {
  const theme = useTheme();
  const imgWidth = size / avatar.face.size;
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 40%, ${theme.colors.surface} 55%, ${theme.colors.sky} 100%)`,
        boxShadow: `0 0 0 6px ${theme.colors.surface}, 0 0 0 10px ${theme.colors.ink}, 0 10px 24px rgba(0, 0, 0, 0.22)`,
      }}
    >
      <MouthImages
        avatar={avatar}
        open={open}
        style={{
          position: 'absolute',
          width: imgWidth,
          height: 'auto',
          maxWidth: 'none',
          left: size / 2 - avatar.face.x * imgWidth,
          top: size / 2 - avatar.face.y * imgWidth,
        }}
      />
    </div>
  );
};

/**
 * 画像2〜3枚の口パク。全部読み込んでおき、表示だけ切り替える (切り替え時のちらつき防止)。
 * half (半開き) があれば 3段階、なければ開く/閉じるの 2段階。
 */
const MouthImages: React.FC<{ avatar: AvatarConfig; open: number; style: React.CSSProperties }> = ({
  avatar,
  open,
  style,
}) => {
  const frames = avatar.half
    ? [
        { src: avatar.closed, show: open < 0.22 },
        { src: avatar.half, show: open >= 0.22 && open < 0.55 },
        { src: avatar.open, show: open >= 0.55 },
      ]
    : [
        { src: avatar.closed, show: open < 0.3 },
        { src: avatar.open, show: open >= 0.3 },
      ];
  return (
    <>
      {frames.map((f) => (
        <Img key={f.src} src={staticFile(f.src)} style={{ ...style, display: f.show ? 'block' : 'none' }} />
      ))}
    </>
  );
};

/** 画像なしで使える組み込みキャラクター (動くのは口だけ) */
const BuiltinCharacter: React.FC<{ size: number; open: number }> = ({ size, open }) => {
  const theme = useTheme();
  // 顔のパーツはテーマに関係なく濃い色で描く (dark テーマでも目と口が見えるように)
  const face = '#1B1B1F';

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
      <ellipse cx={100} cy={188} rx={56} ry={8} fill="rgba(0,0,0,0.18)" />
      <g>
        {/* アンテナ */}
        <line x1={100} y1={30} x2={100} y2={8} stroke={face} strokeWidth={5} strokeLinecap="round" />
        <circle cx={100} cy={8} r={9} fill={theme.colors.warning} />
        {/* 頭 */}
        <circle cx={100} cy={104} r={76} fill={theme.colors.accent} stroke={face} strokeWidth={5} />
        <ellipse cx={100} cy={116} rx={56} ry={48} fill="#FFFFFF" opacity={0.92} />
        {/* 目 */}
        {[72, 128].map((x) => (
          <g key={x} transform={`translate(${x} 100)`}>
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
