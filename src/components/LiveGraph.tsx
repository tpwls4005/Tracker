// 라이브 꺾은선 그래프
// - 일별 달성률(0~100)을 점으로 찍고 선으로 연결, 우측으로 연장되는 구조
// - 하단 면적은 매우 낮은 투명도(5%)로 채워 시각적 안정감
// - 끝점에 화살표 헤드(우상향 연장 암시)
// - animate=true면 진입 시 선이 왼쪽 → 오른쪽으로 그려지는 드로잉 연출
//   (SVG 속성 직접 애니 대신 Animated.Value 리스너로 숫자만 주입 = 웹 세이프)

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { OPACITY, Theme, withAlpha } from '../theme';

export type GraphPoint = { label: string; value: number };

type Props = {
  points: GraphPoint[];
  theme: Theme;
  height?: number;
  minSpacing?: number; // 점 간 최소 간격(px) — 넘치면 가로 스크롤
  showLabels?: boolean;
  scrollToEnd?: boolean;
  animate?: boolean; // 진입 시 드로잉 애니메이션
};

const PAD_X = 22;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

function polylineLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export default function LiveGraph({
  points,
  theme,
  height = 180,
  minSpacing = 46,
  showLabels = true,
  scrollToEnd = true,
  animate = false,
}: Props) {
  const [containerW, setContainerW] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const n = points.length;
  const innerW = Math.max(containerW - PAD_X * 2, 1);
  const spacing = n > 1 ? Math.max(innerW / (n - 1), minSpacing) : innerW;
  const contentW = Math.max(containerW, PAD_X * 2 + spacing * Math.max(n - 1, 0));

  const chartTop = PAD_TOP;
  const chartBottom = height - PAD_BOTTOM;
  const xFor = (i: number) => PAD_X + i * spacing;
  const yFor = (v: number) => chartTop + (1 - v / 100) * (chartBottom - chartTop);
  const baseY = yFor(0);

  const linePts = points.map((p, i) => [xFor(i), yFor(p.value)] as [number, number]);
  const linePath = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath =
    n > 0
      ? `${linePath} L ${linePts[n - 1][0]} ${baseY} L ${linePts[0][0]} ${baseY} Z`
      : '';

  const lineLen = polylineLength(linePts);

  // ---- 드로잉 애니메이션 (0=가려짐 → 1=완전 노출) ----
  const [progress, setProgress] = useState(animate ? 0 : 1);
  useEffect(() => {
    if (!animate || containerW === 0 || n < 2) {
      setProgress(1);
      return;
    }
    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setProgress(value));
    setProgress(0);
    const a = Animated.timing(v, {
      toValue: 1,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => {
      v.removeListener(id);
      a.stop();
    };
  }, [animate, containerW, n]);

  const dashOffset = lineLen * (1 - progress);
  const arrowReveal = progress > 0.9 ? (progress - 0.9) / 0.1 : 0;

  useEffect(() => {
    if (scrollToEnd && contentW > containerW) {
      const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);
      return () => clearTimeout(id);
    }
  }, [contentW, containerW, scrollToEnd, n]);

  // 화살표 헤드: 마지막 선분 방향으로 작은 '<' 모양
  let arrowPath = '';
  if (n > 1) {
    const [x2, y2] = linePts[n - 1];
    const [x1, y1] = linePts[n - 2];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const L = 9;
    const spread = 0.5;
    const ax1 = x2 - L * Math.cos(ang - spread);
    const ay1 = y2 - L * Math.sin(ang - spread);
    const ax2 = x2 - L * Math.cos(ang + spread);
    const ay2 = y2 - L * Math.sin(ang + spread);
    arrowPath = `M ${ax1} ${ay1} L ${x2} ${y2} L ${ax2} ${ay2}`;
  }

  return (
    <View
      style={{ height }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {containerW > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={contentW > containerW}
        >
          <Svg width={contentW} height={height}>
            {/* 0% / 100% 가이드 (아주 옅은 실선) */}
            <Line
              x1={PAD_X}
              y1={baseY}
              x2={contentW - PAD_X}
              y2={baseY}
              stroke={withAlpha(theme.fg, OPACITY.hairline)}
              strokeWidth={1}
            />
            {/* 하단 면적 (5% 투명도) */}
            {n > 0 && (
              <Path d={areaPath} fill={withAlpha(theme.fg, OPACITY.graphFill)} fillOpacity={progress} />
            )}
            {/* 꺾은선 (드로잉) */}
            {n > 1 && (
              <Path
                d={linePath}
                stroke={theme.fg}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={lineLen}
                strokeDashoffset={dashOffset}
              />
            )}
            {/* 데이터 점 — 드로잉 진행에 맞춰 좌→우로 등장 */}
            {linePts.map(([x, y], i) => {
              const appearAt = n > 1 ? i / (n - 1) : 0;
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={i === n - 1 ? 4 : 2.5}
                  fill={theme.fg}
                  opacity={progress >= appearAt ? 1 : 0}
                />
              );
            })}
            {/* 화살표 헤드 */}
            {arrowPath !== '' && (
              <Path
                d={arrowPath}
                stroke={theme.fg}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={arrowReveal}
              />
            )}
            {/* 일자 라벨 */}
            {showLabels &&
              points.map((p, i) => (
                <SvgLabel
                  key={`l${i}`}
                  x={xFor(i)}
                  y={height - 8}
                  color={withAlpha(theme.fg, OPACITY.yesterday)}
                  text={p.label}
                />
              ))}
          </Svg>
        </ScrollView>
      )}
    </View>
  );
}

// SvgText 래퍼 (import 정리용)
import { Text as SvgText } from 'react-native-svg';
function SvgLabel({ x, y, color, text }: { x: number; y: number; color: string; text: string }) {
  return (
    <SvgText x={x} y={y} fontSize={10} fill={color} textAnchor="middle">
      {text}
    </SvgText>
  );
}
