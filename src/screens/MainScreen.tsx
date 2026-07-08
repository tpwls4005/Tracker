// Section 2: Main Page — 메인 데이터 입력 및 트래킹
// 모바일: 상하 분할 (문장 뷰포트 / 체크리스트·라이브그래프)
// 패드: 좌우 분할 (확장형 타임라인 / 통합 체크리스트·와이드 그래프)

import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Typography';
import LiveGraph, { GraphPoint } from '../components/LiveGraph';
import { OPACITY, Theme, withAlpha } from '../theme';
import {
  AppData,
  DayEntry,
  HABIT_MAX,
  HABIT_MIN,
  SENTENCE_MAX,
  achievementRate,
  dateKey,
  dayOfMonth,
  formatKorean,
  monthKeys,
  shiftKey,
  todayKey,
} from '../storage';

type Props = {
  theme: Theme;
  data: AppData;
  update: (updater: (d: AppData) => AppData) => void;
  onOpenDrawer: () => void;
};

const PAD_BREAKPOINT = 768;

const DEMO_SENTENCES = [
  '작게 시작한 하루가 생각보다 단단했다.',
  '미루지 않은 것만으로 충분한 날.',
  '오늘은 나에게 조금 더 친절했다.',
  '흐트러진 마음을 한 줄로 붙잡았다.',
  '완벽하진 않아도 멈추진 않았다.',
  '몸을 움직이니 생각도 가벼워졌다.',
  '비가 와서 마음까지 차분해진 하루.',
  '쉬어가는 것도 트래킹의 일부.',
  '어제의 나에게 부끄럽지 않았다.',
  '작은 습관이 모여 방향이 된다.',
];

export default function MainScreen({ theme, data, update, onOpenDrawer }: Props) {
  const tk = todayKey();
  const yk = shiftKey(tk, -1);
  const habits = data.habits;

  const todayEntry = data.entries[tk];
  const yesterdayEntry = data.entries[yk];

  const [draft, setDraft] = useState<string>(todayEntry?.sentence ?? '');
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [inputFocused, setInputFocused] = useState(false); // 글자 수는 쓰는 동안만 보여준다
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 문장 즉시 저장 (체크 토글 등으로 인한 유실 방지)
  const commitSentence = (text: string) => {
    update((d) => {
      const prev: DayEntry = d.entries[tk] ?? { sentence: '', checks: [] };
      return {
        ...d,
        entries: { ...d.entries, [tk]: { ...prev, sentence: text, habitCount: d.habits.length } },
      };
    });
  };

  // 입력 시 매번 자동 저장됨 — 상태 표시만 갱신 (별도 저장 버튼 없음)
  // '자동 저장됨 ✓'는 2초 뒤 사라져 화면을 비워둔다 (아래 '편집'과의 시각 혼선 방지)
  const onChangeSentence = (text: string) => {
    setDraft(text);
    commitSentence(text);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setSaveState('saving');
    savedTimer.current = setTimeout(() => {
      setSaveState('saved');
      idleTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    }, 700);
  };

  const toggleHabit = (i: number) => {
    update((d) => {
      const prev: DayEntry = d.entries[tk] ?? { sentence: draft, checks: [] };
      const checks = [...prev.checks];
      while (checks.length < d.habits.length) checks.push(false);
      checks[i] = !checks[i];
      return {
        ...d,
        entries: {
          ...d.entries,
          [tk]: { ...prev, checks: checks.slice(0, d.habits.length), habitCount: d.habits.length },
        },
      };
    });
  };

  const todayRate = achievementRate(
    data.entries[tk] ?? { sentence: draft, checks: todayEntry?.checks ?? [] },
    habits.length
  );

  // 라이브 그래프 포인트 (최근 7일, 오늘 포함)
  const RECENT_DAYS = 7;
  const graphPoints: GraphPoint[] = useMemo(
    () =>
      Array.from({ length: RECENT_DAYS }, (_, i) => {
        const k = shiftKey(tk, -(RECENT_DAYS - 1 - i));
        // 기록이 아예 없는 날은 0%가 아니라 null → 그래프에서 선이 끊긴다
        return {
          label: String(dayOfMonth(k)),
          value: data.entries[k] ? achievementRate(data.entries[k], habits.length) : null,
        };
      }),
    [data.entries, habits.length, tk]
  );

  // 지난 기록 (오늘 이전, 문장이 있는 날) — 최신순. "어제" 영역을 터치하면 펼쳐짐
  const [historyOpen, setHistoryOpen] = useState(false);
  const pastKeys = useMemo(
    () =>
      Object.keys(data.entries)
        .filter((k) => k < tk && data.entries[k].sentence.trim().length > 0)
        .sort((a, b) => (a < b ? 1 : -1))
        .slice(0, 14),
    [data.entries, tk]
  );

  const { width } = useWindowSize();
  const isPad = width >= PAD_BREAKPOINT;

  // ---- 부분 렌더러 ----

  const SentenceBlock = (
    <View>
      {/* 어제 영역 — 터치하면 지난 기록이 그 자리에서 펼쳐진다 */}
      <Pressable onPress={() => pastKeys.length > 0 && setHistoryOpen((o) => !o)}>
        <View style={styles.pastHead}>
          <Text style={[styles.miniLabel, { color: withAlpha(theme.fg, OPACITY.yesterday) }]}>
            {historyOpen ? '지난 기록' : '어제'}
          </Text>
          {pastKeys.length > 0 && (
            <Text style={[styles.pastToggle, { color: withAlpha(theme.fg, 0.3) }]}>
              {historyOpen ? '접기 ▴' : `지난 ${pastKeys.length}일 ▾`}
            </Text>
          )}
        </View>

        {historyOpen ? (
          <View style={{ marginTop: 4 }}>
            {pastKeys.map((k, i) => (
              <View key={k} style={styles.pastRow}>
                <Text style={[styles.pastDate, { color: withAlpha(theme.fg, 0.3) }]}>{formatKorean(k)}</Text>
                <Text
                  style={[styles.pastText, { color: withAlpha(theme.fg, Math.max(0.25, 0.7 - i * 0.045)) }]}
                  numberOfLines={2}
                >
                  {data.entries[k].sentence}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text
            style={[styles.yesterday, { color: withAlpha(theme.fg, OPACITY.yesterday) }]}
            numberOfLines={2}
          >
            {yesterdayEntry?.sentence?.trim() ? yesterdayEntry.sentence : '어제의 문장이 아직 없어요'}
          </Text>
        )}
      </Pressable>

      <Text style={[styles.miniLabel, { color: theme.fg, marginTop: 22 }]}>오늘</Text>
      <TextInput
        value={draft}
        onChangeText={onChangeSentence}
        maxLength={SENTENCE_MAX}
        placeholder="오늘을 한 줄로 남겨보세요"
        placeholderTextColor={withAlpha(theme.fg, 0.3)}
        multiline
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        style={[
          styles.todayInput,
          {
            color: theme.fg,
            fontWeight: draft.trim().length > 0 ? '700' : '400',
            borderBottomColor: withAlpha(theme.fg, OPACITY.hairline),
          },
        ]}
      />
      {/* 쓰는 동안만 보이는 보조 정보 — 평소엔 비워 아래 '편집'과 혼선이 없다 */}
      <View style={styles.sentenceFoot}>
        <Text style={[styles.saveState, { color: withAlpha(theme.fg, 0.4) }]}>
          {saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? '자동 저장됨 ✓' : ''}
        </Text>
        {inputFocused && (
          <Text style={[styles.counter, { color: withAlpha(theme.fg, 0.35) }]}>
            {draft.length} / {SENTENCE_MAX}
          </Text>
        )}
      </View>
    </View>
  );

  const Checklist = (
    <View style={{ marginTop: isPad ? 0 : 28 }}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.fg }]}>오늘의 습관</Text>
        <Pressable onPress={() => setEditing(true)} hitSlop={10}>
          <Text style={[styles.linkBtn, { color: withAlpha(theme.fg, 0.5) }]}>편집</Text>
        </Pressable>
      </View>
      {habits.map((h, i) => {
        const checked = !!(data.entries[tk]?.checks?.[i]);
        return (
          <Pressable key={i} style={styles.habitRow} onPress={() => toggleHabit(i)}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: theme.fg,
                  backgroundColor: checked ? theme.fg : 'transparent',
                },
              ]}
            >
              {checked && <Text style={[styles.checkMark, { color: theme.bg }]}>✓</Text>}
            </View>
            <Text
              style={[
                styles.habitLabel,
                { color: checked ? theme.fg : withAlpha(theme.fg, 0.5) },
              ]}
            >
              {h}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const GraphSection = (
    <View style={{ marginTop: 30 }}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.fg }]}>최근 7일 달성 추이</Text>
        <Text style={[styles.ratePill, { color: theme.fg }]}>{todayRate}%</Text>
      </View>
      <LiveGraph
        points={graphPoints}
        theme={theme}
        height={isPad ? 220 : 180}
        minSpacing={isPad ? 40 : 44}
        scrollToEnd={false}
        animate
      />
    </View>
  );

  // 패드 좌측: 확장형 타임라인 (이달의 문장 흐름)
  const Timeline = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 24 }}>
      <Text style={[styles.sectionTitle, { color: theme.fg, marginBottom: 14 }]}>이달의 문장</Text>
      {monthKeys(tk)
        .filter((k) => k <= tk)
        .map((k) => {
          const s = data.entries[k]?.sentence?.trim();
          const isToday = k === tk;
          return (
            <View key={k} style={styles.tlRow}>
              <Text style={[styles.tlDay, { color: withAlpha(theme.fg, isToday ? 0.9 : 0.4) }]}>
                {dayOfMonth(k)}
              </Text>
              <Text
                style={[
                  styles.tlText,
                  {
                    color: s
                      ? withAlpha(theme.fg, isToday ? 1 : 0.7)
                      : withAlpha(theme.fg, 0.2),
                    fontWeight: isToday && s ? '700' : '400',
                  },
                ]}
              >
                {s || '—'}
              </Text>
            </View>
          );
        })}
    </ScrollView>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={[styles.wordmark, { color: theme.fg }]}>Tracker List</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.headerDate, { color: withAlpha(theme.fg, 0.45) }]}>
            {formatKorean(tk)}
          </Text>
          <Pressable onPress={onOpenDrawer} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={[styles.linkBtn, { color: withAlpha(theme.fg, 0.6) }]}>서랍</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isPad ? (
          <View style={styles.padRow}>
            <View style={styles.padLeft}>{Timeline}</View>
            <View style={[styles.padDivider, { backgroundColor: withAlpha(theme.fg, OPACITY.hairline) }]} />
            <ScrollView style={styles.padRight} contentContainerStyle={{ paddingLeft: 24 }}>
              {SentenceBlock}
              {Checklist}
              {GraphSection}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.mobileContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {SentenceBlock}
            {Checklist}
            {GraphSection}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <HabitEditor
        visible={editing}
        theme={theme}
        data={data}
        update={update}
        onClose={() => setEditing(false)}
        demoSentences={DEMO_SENTENCES}
      />
    </View>
  );
}

// ---- 습관 편집 + 데모/초기화 모달 ----

function HabitEditor({
  visible,
  theme,
  data,
  update,
  onClose,
  demoSentences,
}: {
  visible: boolean;
  theme: Theme;
  data: AppData;
  update: (updater: (d: AppData) => AppData) => void;
  onClose: () => void;
  demoSentences: string[];
}) {
  const [names, setNames] = useState<string[]>(data.habits);

  // 모달 열릴 때 현재 습관으로 동기화
  React.useEffect(() => {
    if (visible) setNames(data.habits);
  }, [visible, data.habits]);

  const setName = (i: number, v: string) => {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  };
  const addHabit = () => {
    if (names.length < HABIT_MAX) setNames((prev) => [...prev, '']);
  };
  const removeHabit = (i: number) => {
    if (names.length > HABIT_MIN) setNames((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = () => {
    const cleaned = names.map((n, i) => n.trim() || `습관 ${i + 1}`);
    update((d) => ({ ...d, habits: cleaned }));
    onClose();
  };

  // 올해 1/1 ~ 12/31 전체를 데모로 채운다 (12개월 서랍·365일 피날레 미리보기용)
  const fillDemo = () => {
    update((d) => {
      const entries = { ...d.entries };
      const H = d.habits.length;
      const year = new Date().getFullYear();
      const total = Math.round((new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 86400000) + 1;

      for (let i = 0; i < total; i++) {
        const k = dateKey(new Date(year, 0, 1 + i));

        // 한 해에 걸친 완만한 우상향 추세 + 계절성 등락
        const t = i / (total - 1);
        let rate = 0.3 + 0.5 * t + 0.13 * Math.sin(t * Math.PI * 5);
        rate = Math.max(0, Math.min(1, rate));

        // 달성률을 습관 개수로 환산 후, 어떤 습관이 체크됐는지 셔플로 자연 분산
        const numChecked = Math.max(0, Math.min(H, Math.round(rate * H)));
        const idx = d.habits.map((_, j) => j);
        for (let j = idx.length - 1; j > 0; j--) {
          const r = Math.floor(Math.random() * (j + 1));
          [idx[j], idx[r]] = [idx[r], idx[j]];
        }
        const checks = d.habits.map(() => false);
        for (let j = 0; j < numChecked; j++) checks[idx[j]] = true;

        entries[k] = { sentence: demoSentences[(i * 3 + 1) % demoSentences.length], checks, habitCount: H };
      }
      return { ...d, entries };
    });
    onClose();
  };

  const resetEntries = () => {
    update((d) => ({ ...d, entries: {} }));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: theme.bg, borderColor: withAlpha(theme.fg, 0.2) }]}>
          <Text style={[styles.modalTitle, { color: theme.fg }]}>습관 편집</Text>
          <Text style={[styles.modalSub, { color: withAlpha(theme.fg, 0.45) }]}>
            {HABIT_MIN}~{HABIT_MAX}개로 유지하세요 ({names.length}개)
          </Text>

          <ScrollView style={{ maxHeight: 320, marginTop: 12 }}>
            {names.map((n, i) => (
              <View key={i} style={styles.editRow}>
                <TextInput
                  value={n}
                  onChangeText={(v) => setName(i, v)}
                  placeholder={`습관 ${i + 1}`}
                  placeholderTextColor={withAlpha(theme.fg, 0.3)}
                  style={[
                    styles.editInput,
                    { color: theme.fg, borderBottomColor: withAlpha(theme.fg, OPACITY.hairline) },
                  ]}
                />
                <Pressable onPress={() => removeHabit(i)} hitSlop={8} disabled={names.length <= HABIT_MIN}>
                  <Text style={[styles.removeBtn, { color: withAlpha(theme.fg, names.length <= HABIT_MIN ? 0.2 : 0.55) }]}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <Pressable onPress={addHabit} disabled={names.length >= HABIT_MAX} style={styles.addRow}>
            <Text style={[styles.addText, { color: withAlpha(theme.fg, names.length >= HABIT_MAX ? 0.25 : 0.7) }]}>
              + 습관 추가
            </Text>
          </Pressable>

          <View style={[styles.modalDivider, { backgroundColor: withAlpha(theme.fg, OPACITY.hairline) }]} />

          <View style={styles.modalUtilRow}>
            <Pressable onPress={fillDemo} hitSlop={6}>
              <Text style={[styles.utilBtn, { color: withAlpha(theme.fg, 0.55) }]}>올해 데모 채우기</Text>
            </Pressable>
            <Pressable onPress={resetEntries} hitSlop={6}>
              <Text style={[styles.utilBtn, { color: withAlpha(theme.fg, 0.55) }]}>기록 초기화</Text>
            </Pressable>
          </View>


          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalActionBtn}>
              <Text style={[styles.modalActionText, { color: withAlpha(theme.fg, 0.55) }]}>취소</Text>
            </Pressable>
            <Pressable onPress={save} style={[styles.modalActionBtn, { backgroundColor: theme.fg, borderRadius: 8 }]}>
              <Text style={[styles.modalActionText, { color: theme.bg, fontWeight: '700' }]}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 화면 크기 훅 (react-native useWindowDimensions 래핑)
import { useWindowDimensions } from 'react-native';
function useWindowSize() {
  const { width, height } = useWindowDimensions();
  return { width, height };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
  },
  wordmark: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerDate: { fontSize: 13 },
  linkBtn: { fontSize: 15 },

  mobileContent: { paddingHorizontal: 24, paddingBottom: 80, paddingTop: 8 },

  padRow: { flex: 1, flexDirection: 'row', paddingHorizontal: 24, paddingTop: 8 },
  padLeft: { flex: 1 },
  padDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 4 },
  padRight: { flex: 1, paddingBottom: 60 },

  miniLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  yesterday: { fontSize: 16, lineHeight: 24 },
  todayInput: {
    fontSize: 20,
    lineHeight: 30,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  counter: { fontSize: 12 },
  sentenceFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    minHeight: 16, // 내용이 비어도 높이 고정 (레이아웃 점프 방지)
  },
  saveState: { fontSize: 12, letterSpacing: 0.3 },

  // 어제/지난 기록 펼침
  pastHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastToggle: { fontSize: 12, letterSpacing: 0.3 },
  pastRow: { paddingVertical: 7 },
  pastDate: { fontSize: 11, marginBottom: 3, letterSpacing: 0.3 },
  pastText: { fontSize: 15, lineHeight: 22 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  ratePill: { fontSize: 18, fontWeight: '800' },
  linkBtn2: {},

  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkMark: { fontSize: 14, fontWeight: '900', lineHeight: 16 },
  habitLabel: { fontSize: 16, flex: 1 },

  tlRow: { flexDirection: 'row', paddingVertical: 7 },
  tlDay: { width: 28, fontSize: 13, fontWeight: '700' },
  tlText: { flex: 1, fontSize: 15, lineHeight: 22 },

  // 모달
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13, marginTop: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editInput: { flex: 1, fontSize: 16, paddingVertical: 8, borderBottomWidth: 1 },
  removeBtn: { fontSize: 16 },
  addRow: { paddingVertical: 14 },
  addText: { fontSize: 15, fontWeight: '600' },
  modalDivider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
  modalUtilRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  utilBtn: { fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  modalActionBtn: { paddingVertical: 10, paddingHorizontal: 18 },
  modalActionText: { fontSize: 15 },
});
