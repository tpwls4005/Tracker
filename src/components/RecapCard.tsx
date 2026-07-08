// 결산 카드 — SNS 공유/이미지 저장용 흑백 레이아웃
// 회고를 한 장에: 타이틀 · 미니 꺾은선 · 통계 · 대표 문장 몇 줄
// month를 주면 월 카드, 생략하면 연간(피날레) 카드 — 레이아웃 문법은 동일하다
// 카드 비율은 4:5(340x425) 고정 — 인스타그램 세로 포스트 규격

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Typography';
import LiveGraph, { GraphPoint } from './LiveGraph';
import { Theme, withAlpha } from '../theme';
import {
  AppData,
  MONTH_LABELS,
  achievementRate,
  dayOfMonth,
  monthDayKeys,
  yearDayKeys,
} from '../storage';

type Props = {
  theme: Theme;
  data: AppData;
  year: number;
  month?: number; // 1~12 — 생략하면 연간 카드
  nativeID?: string; // 웹 캡처용 DOM id
};

export default function RecapCard({ theme, data, year, month, nativeID }: Props) {
  const habitCount = data.habits.length;
  const isYear = month == null;
  const keys = useMemo(
    () => (isYear ? yearDayKeys(year) : monthDayKeys(year, month as number)),
    [year, month, isYear]
  );

  const points: GraphPoint[] = useMemo(
    () =>
      keys.map((k) => ({
        label: '',
        // 기록 없는 날은 null → 선이 끊긴다 (0%로 왜곡하지 않음)
        value: data.entries[k] ? achievementRate(data.entries[k], habitCount) : null,
      })),
    [keys, data.entries, habitCount]
  );

  const filled = keys.filter((k) => data.entries[k]?.sentence.trim().length).length;
  const avg = useMemo(() => {
    const withData = keys.filter((k) => data.entries[k]);
    if (!withData.length) return 0;
    const sum = withData.reduce((s, k) => s + achievementRate(data.entries[k], habitCount), 0);
    return Math.round(sum / withData.length);
  }, [keys, data.entries, habitCount]);

  // 대표 문장 3개 — 기간에서 고르게 (처음/중간/끝 부근), 날짜 귀속 라벨 포함
  const highlights = useMemo(() => {
    const withText = keys
      .map((k) => ({
        label: isYear ? `${Number(k.split('-')[1])}/${dayOfMonth(k)}` : String(dayOfMonth(k)),
        s: data.entries[k]?.sentence?.trim() || '',
      }))
      .filter((e) => e.s.length > 0);
    if (withText.length <= 3) return withText;
    const pick = [0, Math.floor(withText.length / 2), withText.length - 1];
    return pick.map((i) => withText[i]);
  }, [keys, data.entries, isYear]);

  return (
    <View nativeID={nativeID} style={[styles.card, { backgroundColor: theme.bg }]}>
      <Text style={[styles.brand, { color: withAlpha(theme.fg, 0.5) }]}>TRACKER LIST</Text>
      <Text style={[styles.title, { color: theme.fg }]}>
        {isYear ? year : `${year} · ${MONTH_LABELS[(month as number) - 1]}`}
      </Text>

      <View style={[styles.rule, { backgroundColor: withAlpha(theme.fg, 0.15) }]} />

      <LiveGraph
        points={points}
        theme={theme}
        height={140}
        minSpacing={isYear ? 0.5 : 6}
        showLabels={false}
        scrollToEnd={false}
      />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.fg }]}>{filled}</Text>
          <Text style={[styles.statLabel, { color: withAlpha(theme.fg, 0.5) }]}>일 기록</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: withAlpha(theme.fg, 0.15) }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.fg }]}>{avg}%</Text>
          <Text style={[styles.statLabel, { color: withAlpha(theme.fg, 0.5) }]}>평균 달성</Text>
        </View>
      </View>

      {highlights.length > 0 && (
        <View style={styles.quotes}>
          {highlights.map((h, i) => (
            <Text key={i} style={[styles.quote, { color: withAlpha(theme.fg, 0.82) }]} numberOfLines={2}>
              <Text style={{ color: withAlpha(theme.fg, 0.35) }}>{h.label} · </Text>
              {h.s}
            </Text>
          ))}
        </View>
      )}

      <Text style={[styles.footer, { color: withAlpha(theme.fg, 0.4) }]}>
        {isYear ? '한 해의 문장' : '한 달의 문장'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    minHeight: 425, // 4:5 고정 (340 × 1.25)
    paddingHorizontal: 30,
    paddingVertical: 34,
    alignSelf: 'center',
  },
  brand: { fontSize: 12, letterSpacing: 3, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 10 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 20, marginBottom: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  stat: { alignItems: 'center', paddingHorizontal: 28 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4, letterSpacing: 0.3 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 42 },

  quotes: { marginTop: 24, gap: 10 },
  quote: { fontSize: 15, lineHeight: 23, textAlign: 'center' },

  // 문장이 적어도 푸터는 항상 카드 바닥에
  footer: { fontSize: 12, letterSpacing: 2, textAlign: 'center', marginTop: 'auto', paddingTop: 28 },
});
