// Section 3: Review Drawer (회고 서랍)
// - 3x4 배열의 12개월 아카이브 서랍 (미니멀 실선 그리드)
// - 월 터치 → 슬라이드 다운 연출과 함께 월 상세 팝업(문장 1~31 + 완성형 그래프)
// - 1년 결산 피날레(FinaleOverlay) 트리거

import React, { useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Typography';
import Svg, { Circle, Line as SvgLine, Path as SvgPath } from 'react-native-svg';
import LiveGraph, { GraphPoint } from '../components/LiveGraph';
import FinaleOverlay from '../components/FinaleOverlay';
import ShareSheet from '../components/ShareSheet';
import { canImportBackup, exportBackup, importBackup } from '../utils/backup';
import { OPACITY, Theme, withAlpha } from '../theme';
import {
  AppData,
  MONTH_LABELS,
  achievementRate,
  dayOfMonth,
  formatKorean,
  monthAvgRate,
  monthDayKeys,
  monthFilledDays,
  monthHasData,
  recordedYears,
  yearOf,
} from '../storage';

type Props = {
  theme: Theme;
  data: AppData;
  update: (updater: (d: AppData) => AppData) => void;
  onBack: () => void;
};

const PAD_BREAKPOINT = 768;

export default function DrawerScreen({ theme, data, update, onBack }: Props) {
  const nowYear = new Date().getFullYear();

  // 기록이 있는 연도 + 올해를 후보로, 최신순 정렬
  const years = useMemo(() => {
    const set = new Set<number>(recordedYears(data.entries));
    set.add(nowYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [data.entries, nowYear]);

  const [year, setYear] = useState<number>(nowYear);
  const [openMonth, setOpenMonth] = useState<number | null>(null); // 1~12
  const [shareMonth, setShareMonth] = useState<number | null>(null); // 공유 시트 대상 월
  const [finale, setFinale] = useState(false);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null); // 웹 hover 셀
  const [query, setQuery] = useState(''); // 문장 검색어

  // 문장 검색 — 전 연도 대상, 최신순
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return Object.keys(data.entries)
      .filter((k) => data.entries[k].sentence.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 50);
  }, [data.entries, query]);

  // 첫 사용자(기록 전무) 여부 — 빈 서랍 안내 카피
  const hasAnyEntry = useMemo(() => Object.keys(data.entries).length > 0, [data.entries]);

  // 백업 JSON 불러오기 — 현재 데이터를 통째로 대체
  const [importStatus, setImportStatus] = useState('');
  const doImport = async () => {
    if (!canImportBackup) {
      setImportStatus('이 기기에서는 불러오기를 지원하지 않아요');
      return;
    }
    const imported = await importBackup();
    if (imported === 'cancelled') return; // 픽커만 닫은 경우 — 조용히
    if (!imported) {
      setImportStatus('올바른 백업 파일이 아니에요');
      return;
    }
    update(() => imported);
    setImportStatus('기록을 불러왔어요 ✓');
  };

  const yearIdx = years.indexOf(year);
  const canPrev = yearIdx < years.length - 1; // 더 과거
  const canNext = yearIdx > 0; // 더 최근

  const habitCount = data.habits.length;

  // 이 해에 기록이 있는 월 수 (서랍 충족도)
  const filledMonths = useMemo(
    () => MONTH_LABELS.filter((_, i) => monthHasData(data.entries, year, i + 1)).length,
    [data.entries, year]
  );

  // 결산은 그 해가 저물 때만 — 지난 해(완결) / 올해 12월 / 12개월 서랍이 모두 충족된 경우(PRD)
  const showFinale =
    year < nowYear || (year === nowYear && (new Date().getMonth() === 11 || filledMonths === 12));

  const { width } = useWindowDimensions();
  const isPad = width >= PAD_BREAKPOINT;

  // 모바일: 그리드가 남는 세로 공간을 넘치지 않게 셀 높이를 맞춘다 (페이지 스크롤 방지)
  const [wrapH, setWrapH] = useState(0);
  const cols = isPad ? 4 : 3;
  const rows = isPad ? 3 : 4;
  const cabinetW = Math.min(isPad ? 560 : 460, width - 40);
  const cellNaturalH = cabinetW / cols / 1.15;
  const cellH =
    !isPad && wrapH > 0 ? Math.min(cellNaturalH, Math.floor(wrapH / rows)) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* 상단 좌측: 뒤로 */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={[styles.back, { color: withAlpha(theme.fg, 0.7) }]}>‹ 오늘</Text>
        </Pressable>
      </View>

      {/* 타이틀 클러스터 — 모바일은 아래로 내려 위 공백 확보, 넓은 화면은 위로 붙임 */}
      <Text style={[styles.wordmark, { color: theme.fg, marginTop: isPad ? 16 : 40 }]}>회고 서랍</Text>

      {/* 연도 셀렉터 */}
      <View style={styles.yearRow}>
        <Pressable onPress={() => canPrev && setYear(years[yearIdx + 1])} hitSlop={12} disabled={!canPrev}>
          <Text style={[styles.yearArrow, { color: withAlpha(theme.fg, canPrev ? 0.6 : 0.15) }]}>‹</Text>
        </Pressable>
        <Text style={[styles.yearLabel, { color: theme.fg }]}>{year}</Text>
        <Pressable onPress={() => canNext && setYear(years[yearIdx - 1])} hitSlop={12} disabled={!canNext}>
          <Text style={[styles.yearArrow, { color: withAlpha(theme.fg, canNext ? 0.6 : 0.15) }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.scrollBody}>
        {/* 문장 검색 — 전 연도의 문장에서 찾는다 */}
        <View style={[styles.searchRow, { borderBottomColor: withAlpha(theme.fg, query ? 0.3 : 0.12) }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="문장 검색"
            placeholderTextColor={withAlpha(theme.fg, 0.25)}
            style={[styles.searchInput, { color: theme.fg }]}
          />
          {query !== '' && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Text style={{ color: withAlpha(theme.fg, 0.4), fontSize: 14 }}>✕</Text>
            </Pressable>
          )}
        </View>

        {query.trim() !== '' ? (
          // ---- 검색 결과 모드 ----
          <ScrollView style={{ flex: 1, marginTop: 18 }} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={[styles.cabinetCaption, { color: withAlpha(theme.fg, 0.4), textAlign: 'left' }]}>
              {searchResults.length > 0 ? `${searchResults.length}개의 문장` : '찾는 문장이 없어요'}
            </Text>
            {searchResults.map((k) => (
              <Pressable
                key={k}
                style={({ pressed }) => [styles.searchHit, pressed && { opacity: 0.5 }]}
                onPress={() => {
                  setYear(yearOf(k));
                  setOpenMonth(Number(k.split('-')[1]));
                }}
              >
                <Text style={[styles.searchHitDate, { color: withAlpha(theme.fg, 0.35) }]}>
                  {yearOf(k)} · {formatKorean(k)}
                </Text>
                <Text style={[styles.searchHitText, { color: withAlpha(theme.fg, 0.8) }]} numberOfLines={2}>
                  {data.entries[k].sentence}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
        <>
        {/* 3x4 서랍 캐비닛 — 모바일은 남는 세로 공간 중앙 배치, 넓은 화면은 위에 붙임 */}
        <View
          style={[styles.cabinetWrap, isPad && styles.cabinetWrapPad]}
          onLayout={(e) => setWrapH(e.nativeEvent.layout.height)}
        >
          <View
            style={[
              styles.cabinet,
              { borderColor: withAlpha(theme.fg, 0.28) },
              { maxWidth: isPad ? 560 : 460, alignSelf: 'center', width: '100%' },
            ]}
          >
            {MONTH_LABELS.map((label, i) => {
              const month = i + 1;
              const has = monthHasData(data.entries, year, month);
              const isThisMonth = year === nowYear && month === new Date().getMonth() + 1;
              return (
                <Pressable
                  key={month}
                  style={({ pressed }) => [
                    styles.cell,
                    isPad && styles.cellPad,
                    // 세로 공간이 부족하면 셀 높이를 줄여 그리드가 화면 안에 들어가게
                    cellH != null && { height: cellH },
                    { borderColor: withAlpha(theme.fg, 0.14) },
                    hoverMonth === month && { backgroundColor: withAlpha(theme.fg, 0.04) },
                    pressed && { backgroundColor: withAlpha(theme.fg, 0.06) },
                  ]}
                  onHoverIn={() => setHoverMonth(month)}
                  onHoverOut={() => setHoverMonth((m) => (m === month ? null : m))}
                  onPress={() => setOpenMonth(month)}
                >
                  <Text
                    style={[
                      styles.cellMonth,
                      {
                        color: has ? theme.fg : withAlpha(theme.fg, 0.32),
                        fontWeight: isThisMonth ? '800' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {isThisMonth && <View style={[styles.todayDot, { backgroundColor: theme.fg }]} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 넓은 화면: 캐비닛과 결산 사이 여백을 밀어 결산/티저를 맨 아래로 */}
        {isPad && <View style={{ flex: 1 }} />}

        {/* 1년 결산 — 노출 가능할 때만 회색 버튼 (넓은 화면은 바닥에서 살짝 띄움) */}
        {showFinale && (
          <View style={[styles.finaleZone, isPad && { marginBottom: 26 }]}>
            <Text style={[styles.finaleProgress, { color: withAlpha(theme.fg, 0.35) }]}>
              {filledMonths} / 12개월 기록됨
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.finaleBtn,
                { borderColor: withAlpha(theme.fg, 0.28), backgroundColor: pressed ? withAlpha(theme.fg, 0.06) : 'transparent' },
              ]}
              onPress={() => setFinale(true)}
            >
              <Text style={[styles.finaleBtnText, { color: withAlpha(theme.fg, 0.5) }]}>
                {year} 결산 보기
              </Text>
            </Pressable>
            <Text style={[styles.finaleTeaser, { color: withAlpha(theme.fg, 0.3) }]}>
              한 해 동안 남긴 문장과 달성 궤적을 한 편의 결산으로 되짚어드려요
            </Text>
          </View>
        )}

        {/* 캐비닛 캡션 — 서랍 화면 맨 아래, 백업 복원 링크 바로 위 */}
        <Text style={[styles.cabinetCaption, { color: withAlpha(theme.fg, 0.4), marginTop: 18 }]}>
          {hasAnyEntry
            ? '월을 열어 그 달의 기록을 꺼내보세요'
            : '첫 문장을 남기면 이 서랍이 채워지기 시작해요'}
        </Text>

        {/* 백업 복원 — 서랍의 맨 아래, 존재감 없이 */}
        <Pressable onPress={doImport} hitSlop={8} style={styles.importRow}>
          <Text style={[styles.importText, { color: withAlpha(theme.fg, 0.25) }]}>
            {importStatus || '백업 불러오기'}
          </Text>
        </Pressable>
        </>
        )}
      </View>

      <MonthDetail
        theme={theme}
        data={data}
        year={year}
        month={openMonth}
        onClose={() => setOpenMonth(null)}
        onShareCard={() => openMonth != null && setShareMonth(openMonth)}
      />

      <ShareSheet
        theme={theme}
        data={data}
        period={shareMonth != null ? { year, month: shareMonth } : null}
        onClose={() => setShareMonth(null)}
      />

      {finale && (
        <FinaleOverlay theme={theme} data={data} year={year} onClose={() => setFinale(false)} />
      )}
    </View>
  );
}

// ---- 월 상세 팝업 (슬라이드 다운 연출) ----

function MonthDetail({
  theme,
  data,
  year,
  month,
  onClose,
  onShareCard,
}: {
  theme: Theme;
  data: AppData;
  year: number;
  month: number | null;
  onClose: () => void;
  onShareCard: () => void;
}) {
  const visible = month != null;
  const slide = React.useRef(new Animated.Value(0)).current; // 0(숨김) → 1(펼침)

  // 태블릿/웹에서 시트가 화면 전체폭으로 늘어나지 않도록 폭 제한 + 중앙정렬
  const { width } = useWindowDimensions();
  const isPad = width >= PAD_BREAKPOINT;

  React.useEffect(() => {
    if (visible) {
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slide]);

  const habitCount = data.habits.length;

  const keys = useMemo(() => (month ? monthDayKeys(year, month) : []), [year, month]);

  // 완성형 복합 그래프: 그 달 1~말일 전체
  const points: GraphPoint[] = useMemo(
    () =>
      keys.map((k) => ({
        label: String(dayOfMonth(k)),
        // 기록 없는 날(미래 포함)은 null → 선이 끊겨 '안 한 날'과 '0% 한 날'이 구분된다
        value: data.entries[k] ? achievementRate(data.entries[k], habitCount) : null,
      })),
    [keys, data.entries, habitCount]
  );

  const filled = keys.filter((k) => data.entries[k]?.sentence.trim().length).length;

  // 그 달의 기록만 담은 JSON 내보내기 (웹=다운로드 / 네이티브=공유 시트)
  const exportMonth = () => {
    if (month == null) return;
    const entries: AppData['entries'] = {};
    for (const k of keys) if (data.entries[k]) entries[k] = data.entries[k];
    exportBackup(
      { ...data, entries },
      `tracker-list-${year}-${String(month).padStart(2, '0')}.json`
    );
  };

  if (!visible) return null;

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.sheetBackdrop, { backgroundColor: withAlpha(theme.isDark ? '#FFFFFF' : '#000000', 0.35) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            isPad && styles.sheetPad,
            { backgroundColor: theme.bg, borderColor: withAlpha(theme.fg, 0.15), opacity: slide, transform: [{ translateY }] },
          ]}
        >
          {/* 서랍 손잡이 */}
          <View style={[styles.handle, { backgroundColor: withAlpha(theme.fg, 0.25) }]} />

          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.fg }]}>
              {year} · {MONTH_LABELS[(month as number) - 1]}
            </Text>
            <View style={styles.sheetHeadRight}>
              <Pressable
                onPress={exportMonth}
                hitSlop={10}
                accessibilityLabel="월 데이터 내보내기"
                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
              >
                <DownloadIcon color={withAlpha(theme.fg, 0.7)} size={20} />
              </Pressable>
              <Pressable
                onPress={onShareCard}
                hitSlop={10}
                accessibilityLabel="결산 카드 공유"
                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}
              >
                <ShareIcon color={withAlpha(theme.fg, 0.7)} size={20} />
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}>
                <Text style={[styles.sheetClose, { color: withAlpha(theme.fg, 0.55) }]}>✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            {/* 완성형 꺾은선 복합 그래프 */}
            <Text style={[styles.sheetSection, { color: withAlpha(theme.fg, 0.5) }]}>이달의 달성 추이</Text>
            <LiveGraph points={points} theme={theme} height={190} minSpacing={30} scrollToEnd={false} />

            {/* 문장 리스트 1~31 */}
            <Text style={[styles.sheetSection, { color: withAlpha(theme.fg, 0.5), marginTop: 24 }]}>
              이달의 문장 · {filled}일
            </Text>
            {keys.map((k) => {
              const s = data.entries[k]?.sentence?.trim();
              return (
                <View key={k} style={styles.monthRow}>
                  <Text style={[styles.monthDay, { color: withAlpha(theme.fg, s ? 0.9 : 0.35) }]}>
                    {dayOfMonth(k)}
                  </Text>
                  <Text
                    style={[
                      styles.monthText,
                      { color: s ? withAlpha(theme.fg, 0.8) : withAlpha(theme.fg, 0.2) },
                    ]}
                    numberOfLines={2}
                  >
                    {s || '—'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// 모노톤 다운로드 아이콘 (아래 화살표 + 받침)
function DownloadIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgLine x1={12} y1={4} x2={12} y2={15} stroke={color} strokeWidth={1.6} />
      <SvgPath d="M 7.5 11 L 12 15.5 L 16.5 11" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <SvgLine x1={5} y1={19.5} x2={19} y2={19.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

// 모노톤 공유 아이콘 (세 노드가 이어진 형태)
function ShareIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgLine x1={7.5} y1={12} x2={16.5} y2={6} stroke={color} strokeWidth={1.6} />
      <SvgLine x1={7.5} y1={12} x2={16.5} y2={18} stroke={color} strokeWidth={1.6} />
      <Circle cx={17} cy={5} r={2.6} stroke={color} strokeWidth={1.6} fill="none" />
      <Circle cx={6} cy={12} r={2.6} stroke={color} strokeWidth={1.6} fill="none" />
      <Circle cx={17} cy={19} r={2.6} stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheetHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  topBar: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 0,
  },
  back: { fontSize: 15 },
  wordmark: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 40,
  },
  linkBtn: { fontSize: 15 },

  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingVertical: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  yearArrow: { fontSize: 26, fontWeight: '400', width: 26, textAlign: 'center' },
  yearLabel: { fontSize: 22, fontWeight: '800', letterSpacing: 1, minWidth: 84, textAlign: 'center' },

  scrollBody: { flex: 1, paddingHorizontal: 20, paddingBottom: 54 },

  cabinetCaption: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 4, letterSpacing: 0.3 },

  // 문장 검색
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8, letterSpacing: 0.3 },
  searchHit: { paddingVertical: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  searchHitDate: { fontSize: 11, letterSpacing: 0.4, marginBottom: 3 },
  searchHitText: { fontSize: 15, lineHeight: 22 },

  // 남는 세로 공간에서 캐비닛을 중앙 정렬 (하단 공백 최소화)
  cabinetWrap: { flex: 1, justifyContent: 'center' },
  // 넓은 화면: 캐비닛을 위쪽에 두되(캡션이 위 여백 담당), 아래 여백은 하단 스페이서가 담당
  // 주의: flex:0은 웹에서 flex-basis:0%가 되어 높이가 0으로 붕괴 → 명시적으로 auto 지정
  cabinetWrapPad: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', justifyContent: 'flex-start', marginTop: 64 },

  // 캐비닛: 바깥 테두리 + 셀들의 내부 헤어라인이 하나의 격자를 이룬다
  cabinet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cell: {
    width: '33.333%',
    aspectRatio: 1.15,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // 넓은 화면: 4열(25%) → 3행. 가로 공간을 쓰고 세로를 아껴 결산 버튼과 겹치지 않게
  cellPad: { width: '25%' },
  cellMonth: { fontSize: 19, letterSpacing: 0.3 },
  todayDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 14 },

  finaleZone: { alignItems: 'center', marginTop: 20, gap: 12 },
  finaleProgress: { fontSize: 12, letterSpacing: 0.5 },
  finaleBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  finaleBtnText: { fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
  finaleTeaser: { fontSize: 12.5, letterSpacing: 0.3, textAlign: 'center' },
  importRow: { alignItems: 'center', marginTop: 14 },
  importText: { fontSize: 11, letterSpacing: 0.4 },

  // 월 상세 시트
  sheetBackdrop: { flex: 1, justifyContent: 'flex-start' },
  sheet: {
    marginTop: Platform.OS === 'ios' ? 70 : 54,
    marginHorizontal: 0,
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  // 넓은 화면: 전체폭으로 늘어나지 않게 폭 제한 + 중앙정렬, 떠 있는 카드처럼 아래 여백/전체 라운드
  sheetPad: {
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    marginTop: 70,
    marginBottom: 40,
    borderRadius: 22,
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  sheetClose: { fontSize: 17 },
  sheetSection: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },

  monthRow: { flexDirection: 'row', paddingVertical: 8, alignItems: 'flex-start' },
  monthDay: { width: 30, fontSize: 13, fontWeight: '700', paddingTop: 1 },
  monthText: { flex: 1, fontSize: 15, lineHeight: 22 },
});
