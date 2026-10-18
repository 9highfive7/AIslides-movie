import React from 'react';
import { Easing, interpolate } from 'remotion';

const NUMBER_PATTERN = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

/**
 * "3倍" "200K" "6,100" "98.5%" のような値の数字部分を 0 からカウントアップする。
 * 数字を含まない値はそのまま表示する。
 */
export const formatCountUp = (value: string, progress: number): string => {
  const match = NUMBER_PATTERN.exec(value);
  if (!match || progress >= 1) {
    return value;
  }
  const [, prefix, numText, suffix] = match;
  const target = Number(numText.replace(/,/g, ''));
  const decimals = numText.includes('.') ? numText.split('.')[1].length : 0;
  const t = Easing.out(Easing.cubic)(Math.max(0, progress));
  const current = target * t;
  const formatted = current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: numText.includes(','),
  });
  return `${prefix}${formatted}${suffix}`;
};

export const CountUp: React.FC<{
  value: string;
  frame: number;
  at: number;
  durationFrames?: number;
}> = ({ value, frame, at, durationFrames = 28 }) => {
  const progress = interpolate(frame, [at, at + durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <>{formatCountUp(value, progress)}</>;
};
