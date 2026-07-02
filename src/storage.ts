// Tracker List — 데이터 모델 · 로컬 우선 스토리지 · 날짜 유틸
// 모든 데이터는 기기 내부(AsyncStorage)에만 저장된다. 외부 전송 없음.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type DayEntry = {
  sentence: string; // 한 줄 문장 (한글 기준 60자 제한은 입력단에서)
  checks: boolean[]; // 습관 index에 정렬된 체크 상태
  habitCount?: number; // 그날 시점의 습관 개수 스냅샷 — 이후 개수를 바꿔도 이 날 달성률은 고정
};

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppData = {
  habits: string[]; // 6~10개 핵심 습관
  entries: Record<string, DayEntry>; // key: YYYY-MM-DD
  themeMode: ThemeMode;
};

export const HABIT_MIN = 6;
export const HABIT_MAX = 10;
export const SENTENCE_MAX = 60;

export const DEFAULT_HABITS = [
  '물 충분히 마시기',
  '30분 이상 몸 움직이기',
  '책 10쪽 읽기',
  '주변 정리정돈',
  '감사한 일 한 가지 떠올리기',
  '일찍 잠자리에 들기',
];

const STORAGE_KEY = 'trackerList_v1';

export function defaultData(): AppData {
  return { habits: [...DEFAULT_HABITS], entries: {}, themeMode: 'system' };
}

// 외부 JSON(저장본·백업 파일)을 안전한 AppData로 보정 — 백업 불러오기와 로드가 공유
export function normalizeData(parsed: Partial<AppData>): AppData {
  return {
    habits: parsed.habits?.length ? parsed.habits : [...DEFAULT_HABITS],
    entries: parsed.entries ?? {},
    themeMode: parsed.themeMode ?? 'system',
  };
}

// 백업 JSON이 최소한의 형태를 갖췄는지 검사
export function isBackupShape(x: unknown): x is Partial<AppData> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.habits != null && !Array.isArray(o.habits)) return false;
  if (o.entries != null && (typeof o.entries !== 'object' || Array.isArray(o.entries))) return false;
  return o.habits != null || o.entries != null;
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {
    return defaultData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패는 조용히 무시 (다음 변경 시 재시도)
  }
}

// ---- 날짜 유틸 (로컬 타임존 기준) ----

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

// key("YYYY-MM-DD")에서 delta일 만큼 이동한 key 반환
export function shiftKey(key: string, delta: number): string {
  const [y, m, dd] = key.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  d.setDate(d.getDate() + delta);
  return dateKey(d);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "6월 23일 (월)" 형태
export function formatKorean(key: string): string {
  const [y, m, dd] = key.split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  return `${m}월 ${dd}일 (${WEEKDAYS[d.getDay()]})`;
}

export function dayOfMonth(key: string): number {
  return Number(key.split('-')[2]);
}

// 해당 key가 속한 달의 1일부터 마지막 날까지 key 배열
export function monthKeys(key: string): string[] {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const out: string[] = [];
  for (let i = 1; i <= last; i++) out.push(`${y}-${pad2(m)}-${pad2(i)}`);
  return out;
}

// 당월 1일부터 오늘까지 (라이브 그래프용)
export function monthToTodayKeys(): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const out: string[] = [];
  for (let i = 1; i <= now.getDate(); i++) out.push(`${y}-${pad2(m)}-${pad2(i)}`);
  return out;
}

// ---- Section 3(Drawer) 연·월 유틸 ----

export const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

// 특정 연·월(1~12)의 1일~말일 key 배열
export function monthDayKeys(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let i = 1; i <= last; i++) out.push(`${year}-${pad2(month)}-${pad2(i)}`);
  return out;
}

// 특정 연도 1/1 ~ 12/31 전체 key (윤년 자동 반영)
export function yearDayKeys(year: number): string[] {
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) out.push(...monthDayKeys(year, m));
  return out;
}

// key의 연도
export function yearOf(key: string): number {
  return Number(key.split('-')[0]);
}

// 데이터에 유효 기록(문장 or 체크)이 존재하는 연도 목록 — 최신순
export function recordedYears(entries: Record<string, DayEntry>): number[] {
  const set = new Set<number>();
  for (const k of Object.keys(entries)) {
    const e = entries[k];
    if (e && (e.sentence.trim().length > 0 || e.checks.some(Boolean))) set.add(yearOf(k));
  }
  return Array.from(set).sort((a, b) => b - a);
}

// 해당 월에 문장 또는 체크 기록이 하나라도 있는지
export function monthHasData(entries: Record<string, DayEntry>, year: number, month: number): boolean {
  return monthDayKeys(year, month).some((k) => {
    const e = entries[k];
    return !!e && (e.sentence.trim().length > 0 || e.checks.some(Boolean));
  });
}

// 해당 월에서 문장이 기록된 날 수
export function monthFilledDays(entries: Record<string, DayEntry>, year: number, month: number): number {
  return monthDayKeys(year, month).filter((k) => entries[k]?.sentence.trim().length).length;
}

// 해당 월 평균 달성률 (기록이 있는 날 기준)
export function monthAvgRate(
  entries: Record<string, DayEntry>,
  year: number,
  month: number,
  habitCount: number
): number {
  const withData = monthDayKeys(year, month).filter((k) => entries[k]);
  if (!withData.length) return 0;
  const sum = withData.reduce((s, k) => s + achievementRate(entries[k], habitCount), 0);
  return Math.round(sum / withData.length);
}

// ---- 달성률 계산 ----
// 공식: (당일 체크 완료된 습관 개수 / 그날의 습관 개수) × 100
// 분모는 그날 스냅샷(entry.habitCount)을 우선 사용 → 이후 습관 개수를 바꿔도 과거 수치가 고정된다.
// 스냅샷이 없는(옛) 기록은 현재 습관 개수(fallback)로 계산.
export function achievementRate(entry: DayEntry | undefined, fallbackHabitCount: number): number {
  if (!entry) return 0;
  const denom = entry.habitCount && entry.habitCount > 0 ? entry.habitCount : fallbackHabitCount;
  if (!denom) return 0;
  const done = entry.checks.slice(0, denom).filter(Boolean).length;
  return Math.round((done / denom) * 100);
}

// 습관 토글 — checks 배열 길이를 habitCount에 맞춰 보정 후 i번째 반전
export function toggledChecks(entry: DayEntry | undefined, i: number, habitCount: number): boolean[] {
  const checks = entry ? [...entry.checks] : [];
  while (checks.length < habitCount) checks.push(false);
  checks[i] = !checks[i];
  return checks.slice(0, habitCount);
}
