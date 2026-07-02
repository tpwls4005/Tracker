// 1년 만기 결산 피날레 (Year-End Finale Event) — 4 Phase 연출
//  Phase 1: 365개 문장 파노라마 스크롤 (엔딩 크레딧, 아래→위, 투명도 20~90% 불규칙)
//  Phase 2: 12개월 통합 마스터 그래프 롤링 포커스 (1월→우측, 시선 추적 4.0초)
//  Phase 3: 끝점 점멸 + 피날레 덕담 텍스트 페이드인
//  Phase 4: 결산 카드 · 공유
//
// 구현 메모: SVG 속성을 직접 Animated로 잇지 않고(웹 렌더러 깨짐 방지),
// 래핑 View의 transform(translateX/Y)만 애니메이트하고 숫자 값은 리스너로 주입한다.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { OPACITY, Theme, withAlpha } from '../theme';
import {
  AppData,
  MONTH_LABELS,
  achievementRate,
  monthDayKeys,
  yearDayKeys,
} from '../storage';

type Phase = 'credits' | 'graph' | 'final';

type Props = {
  theme: Theme;
  data: AppData;
  year: number;
  onClose: () => void;
};

const FINALE_MESSAGE =
  '바쁜 일상 속에서도 나를 위해 구태여 시간을 내어 남긴 365번의 다정함이 모여, ' +
  '올해도 멋진 궤적을 만들어냈어요. 정말 고생 많았어요. 내년의 그래프도 분명 근사할 거예요.';

// 인덱스 기반 불규칙 투명도 (0.2 ~ 0.9) — 잔상처럼 중첩되는 깊이감
function creditOpacity(i: number): number {
  return 0.2 + 0.7 * (((i * 73 + 17) % 100) / 100);
}

export default function FinaleOverlay({ theme, data, year, onClose }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('credits');
  const habitCount = data.habits.length;

  // ---- 데이터 준비 ----
  const sentences = useMemo(
    () =>
      yearDayKeys(year)
        .map((k) => data.entries[k]?.sentence?.trim())
        .filter((s): s is string => !!s && s.length > 0),
    [year, data.entries]
  );

  // 일별 달성률 + 월 시작 인덱스(라벨용)
  const { dayVals, monthTicks } = useMemo(() => {
    const vals: number[] = [];
    const ticks: { label: string; idx: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      ticks.push({ label: MONTH_LABELS[m - 1], idx: vals.length });
      for (const k of monthDayKeys(year, m)) vals.push(achievementRate(data.entries[k], habitCount));
    }
    return { dayVals: vals, monthTicks: ticks };
  }, [year, data.entries, habitCount]);

  const avgRate = useMemo(() => {
    const withData = yearDayKeys(year).filter((k) => data.entries[k]);
    if (!withData.length) return 0;
    const sum = withData.reduce((s, k) => s + achievementRate(data.entries[k], habitCount), 0);
    return Math.round(sum / withData.length);
  }, [year, data.entries, habitCount]);

  // ---- 마스터 그래프 지오메트리 ----
  const graphH = Math.min(Math.round(screenH * 0.42), 300);
  const PAD_X = 24;
  const topY = 30;
  const bottomY = graphH - 54;
  const n = dayVals.length;
  const spacing = 6;
  const contentW = Math.max(screenW, PAD_X * 2 + spacing * Math.max(n - 1, 1));
  const maxShift = Math.max(contentW - screenW, 0);

  const xFor = (i: number) => PAD_X + i * spacing;
  const yFor = (v: number) => topY + (1 - v / 100) * (bottomY - topY);

  const linePts = dayVals.map((v, i) => [xFor(i), yFor(v)] as [number, number]);
  const linePath = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath =
    n > 0 ? `${linePath} L ${linePts[n - 1][0]} ${yFor(0)} L ${linePts[0][0]} ${yFor(0)} Z` : '';

  let arrowPath = '';
  if (n > 1) {
    const [x2, y2] = linePts[n - 1];
    const [x1, y1] = linePts[n - 2];
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const L = 10;
    const sp = 0.5;
    arrowPath =
      `M ${x2 - L * Math.cos(ang - sp)} ${y2 - L * Math.sin(ang - sp)} ` +
      `L ${x2} ${y2} L ${x2 - L * Math.cos(ang + sp)} ${y2 - L * Math.sin(ang + sp)}`;
  }

  // ---- Phase 1: 크레딧 스크롤 ----
  const scrollY = useRef(new Animated.Value(0)).current;
  const [contentH, setContentH] = useState(0);
  const creditsStarted = useRef(false);

  useEffect(() => {
    if (phase !== 'credits' || contentH === 0 || creditsStarted.current) return;
    creditsStarted.current = true;
    scrollY.setValue(screenH);
    const duration = Math.min(Math.max(sentences.length * 300, 5200), 15000);
    const anim = Animated.timing(scrollY, {
      toValue: -contentH - 40,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setPhase('graph');
    });
    return () => anim.stop();
  }, [phase, contentH, screenH, sentences.length, scrollY]);

  // ---- Phase 2: 롤링 포커스 ----
  const rollX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== 'graph') return;
    rollX.setValue(0);
    const anim = Animated.timing(rollX, {
      toValue: -maxShift,
      duration: 4000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setPhase('final');
    });
    return () => anim.stop();
  }, [phase, maxShift, rollX]);

  // ---- Phase 3: 끝점 점멸 + 메시지 페이드인 ----
  const msgOpacity = useRef(new Animated.Value(0)).current;
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const [dotOp, setDotOp] = useState(1);

  useEffect(() => {
    if (phase !== 'final') return;
    const msg = Animated.timing(msgOpacity, {
      toValue: 1,
      duration: 1400,
      delay: 400,
      useNativeDriver: true,
    });
    const ctrl = Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 900,
      delay: 1600,
      useNativeDriver: true,
    });
    msg.start();
    ctrl.start();

    const v = new Animated.Value(0);
    const id = v.addListener(({ value }) => setDotOp(0.25 + 0.75 * Math.abs(Math.sin(value * Math.PI))));
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => {
      msg.stop();
      ctrl.stop();
      loop.stop();
      v.removeListener(id);
    };
  }, [phase, msgOpacity, controlsOpacity]);

  const share = async () => {
    try {
      await Share.share({
        message:
          `${year} Tracker List 결산\n` +
          `한 해 동안 남긴 문장 ${sentences.length}개 · 평균 달성률 ${avgRate}%\n\n` +
          `"${FINALE_MESSAGE}"`,
      });
    } catch {
      // 공유 취소/미지원은 조용히 무시
    }
  };

  const showGraph = phase === 'graph' || phase === 'final';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* 나가기 / 건너뛰기 */}
      <Pressable
        style={styles.skip}
        hitSlop={12}
        onPress={() => (phase === 'final' ? onClose() : setPhase('final'))}
      >
        <Text style={[styles.skipText, { color: withAlpha(theme.fg, 0.5) }]}>
          {phase === 'final' ? '닫기' : '건너뛰기'}
        </Text>
      </Pressable>

      {/* Phase 1: 문장 파노라마 크레딧 */}
      {phase === 'credits' && (
        <View style={styles.creditsClip} pointerEvents="none">
          <Animated.View
            style={[styles.creditsInner, { transform: [{ translateY: scrollY }] }]}
            onLayout={(e) => setContentH(e.nativeEvent.layout.height)}
          >
            <Text style={[styles.creditsYear, { color: withAlpha(theme.fg, 0.9) }]}>{year}</Text>
            {sentences.length === 0 ? (
              <Text style={[styles.creditLine, { color: withAlpha(theme.fg, 0.5) }]}>
                아직 남긴 문장이 없어요
              </Text>
            ) : (
              sentences.map((s, i) => (
                <Text
                  key={i}
                  style={[styles.creditLine, { color: withAlpha(theme.fg, creditOpacity(i)) }]}
                >
                  {s}
                </Text>
              ))
            )}
            <Text style={[styles.creditsYear, { color: withAlpha(theme.fg, 0.5), marginTop: 40 }]}>
              · · ·
            </Text>
          </Animated.View>
        </View>
      )}

      {/* Phase 2·3: 마스터 그래프 롤링 포커스 */}
      {showGraph && (
        <View style={styles.graphWrap}>
          {/* 덕담 메시지 (Phase 3) */}
          <Animated.View style={[styles.messageZone, { opacity: msgOpacity }]}>
            <Text style={[styles.messageText, { color: theme.fg }]}>{FINALE_MESSAGE}</Text>
          </Animated.View>

          {/* 클리핑 뷰포트 안에서 넓은 그래프를 좌→우로 이동 */}
          <View style={[styles.graphClip, { height: graphH, width: screenW }]}>
            <Animated.View style={{ width: contentW, height: graphH, transform: [{ translateX: rollX }] }}>
              <Svg width={contentW} height={graphH}>
                {/* 0% 기준선 */}
                <Line
                  x1={PAD_X}
                  y1={yFor(0)}
                  x2={contentW - PAD_X}
                  y2={yFor(0)}
                  stroke={withAlpha(theme.fg, OPACITY.hairline)}
                  strokeWidth={1}
                />
                {/* 월 경계 눈금 + 라벨 */}
                {monthTicks.map((t) => (
                  <React.Fragment key={t.label}>
                    <Line
                      x1={xFor(t.idx)}
                      y1={topY}
                      x2={xFor(t.idx)}
                      y2={yFor(0)}
                      stroke={withAlpha(theme.fg, 0.06)}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={xFor(t.idx) + 4}
                      y={graphH - 30}
                      fontSize={11}
                      fill={withAlpha(theme.fg, 0.4)}
                    >
                      {t.label}
                    </SvgText>
                  </React.Fragment>
                ))}
                {/* 하단 면적 5% */}
                {n > 0 && <Path d={areaPath} fill={withAlpha(theme.fg, OPACITY.graphFill)} />}
                {/* 마스터 꺾은선 */}
                {n > 1 && (
                  <Path
                    d={linePath}
                    stroke={theme.fg}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
                {/* 끝점 화살표 */}
                {arrowPath !== '' && (
                  <Path
                    d={arrowPath}
                    stroke={theme.fg}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
                {/* 12/31 끝점 — Phase 3에서 점멸 */}
                {n > 0 && (
                  <Circle
                    cx={linePts[n - 1][0]}
                    cy={linePts[n - 1][1]}
                    r={5}
                    fill={theme.fg}
                    opacity={phase === 'final' ? dotOp : 1}
                  />
                )}
              </Svg>
            </Animated.View>
          </View>

          {/* Phase 4: 결산 카드 · 공유 */}
          {phase === 'final' && (
            <Animated.View style={[styles.finalControls, { opacity: controlsOpacity }]}>
              <View style={[styles.card, { borderColor: withAlpha(theme.fg, 0.2) }]}>
                <Text style={[styles.cardYear, { color: theme.fg }]}>{year}</Text>
                <View style={styles.cardStats}>
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: theme.fg }]}>{sentences.length}</Text>
                    <Text style={[styles.statLabel, { color: withAlpha(theme.fg, 0.45) }]}>남긴 문장</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: withAlpha(theme.fg, OPACITY.hairline) }]} />
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, { color: theme.fg }]}>{avgRate}%</Text>
                    <Text style={[styles.statLabel, { color: withAlpha(theme.fg, 0.45) }]}>평균 달성률</Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.shareBtn, { backgroundColor: theme.fg }]}
                onPress={share}
              >
                <Text style={[styles.shareText, { color: theme.bg }]}>결산 카드 공유</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10} style={{ paddingVertical: 8 }}>
                <Text style={[styles.doneText, { color: withAlpha(theme.fg, 0.5) }]}>서랍으로 돌아가기</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  skip: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    right: 22,
    zIndex: 10,
  },
  skipText: { fontSize: 14, letterSpacing: 0.3 },

  // 크레딧
  creditsClip: { flex: 1, overflow: 'hidden' },
  creditsInner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  creditsYear: { fontSize: 30, fontWeight: '800', letterSpacing: 2, marginBottom: 30 },
  creditLine: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginVertical: 9,
  },

  // 그래프 화면
  graphWrap: { flex: 1, justifyContent: 'center' },
  messageZone: { paddingHorizontal: 34, marginBottom: 26 },
  messageText: { fontSize: 17, lineHeight: 27, fontWeight: '600', textAlign: 'center' },
  graphClip: { overflow: 'hidden', alignSelf: 'center' },

  finalControls: { alignItems: 'center', marginTop: 28, paddingHorizontal: 30 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
  },
  cardYear: { fontSize: 26, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },
  cardStats: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 26 },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 40 },

  shareBtn: {
    marginTop: 22,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  shareText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  doneText: { fontSize: 13, marginTop: 6 },
});
