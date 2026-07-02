// 우상향 꺾은선 그래프 로고
// 앱 진입 시 선이 왼쪽 → 오른쪽으로 뻗어 나가며 끝점이 우상향으로 고정되는
// 드로잉 애니메이션 (0.8초 듀레이션)
//
// 구현 메모: AnimatedComponent로 SVG 속성을 직접 애니메이트하면 react-native-svg
// 웹 렌더러에서 깨지므로, Animated.Value 리스너로 일반 <Path>에 숫자 값만 주입한다.
// (웹·iOS·Android 모두 안전)

import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

// viewBox 0 0 120 72 기준, 전반적으로 우상향하는 꺾은선
const POINTS: [number, number][] = [
  [6, 60],
  [28, 50],
  [48, 56],
  [70, 34],
  [92, 42],
  [114, 14],
];

function buildPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

function pathLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

type Props = {
  color: string;
  size?: number;
  duration?: number;
  onDone?: () => void;
};

export default function LogoMark({ color, size = 132, duration = 800, onDone }: Props) {
  const d = useMemo(() => buildPath(POINTS), []);
  const len = useMemo(() => pathLength(POINTS), []);
  const last = POINTS[POINTS.length - 1];

  const [offset, setOffset] = useState(len); // len(가려짐) → 0(완전 노출)
  const [tip, setTip] = useState(0); // 끝점 dot 투명도

  useEffect(() => {
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => {
      setOffset(len * (1 - value));
      setTip(value > 0.85 ? (value - 0.85) / 0.15 : 0);
    });
    const anim = Animated.timing(v, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) onDone?.();
    });
    return () => {
      v.removeListener(id);
      anim.stop();
    };
  }, [duration, onDone, len]);

  const w = size;
  const h = (size * 72) / 120;

  return (
    <Svg width={w} height={h} viewBox="0 0 120 72">
      <Path
        d={d}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={len}
        strokeDashoffset={offset}
      />
      <Circle cx={last[0]} cy={last[1]} r={4.5} fill={color} opacity={tip} />
    </Svg>
  );
}
