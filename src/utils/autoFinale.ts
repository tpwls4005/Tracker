// 연말 자동 피날레 판정
// 12/31 ~ 다음 해 1/7 창 안에서 앱을 열면, 방금 저문 해의 피날레를 자동으로 띄운다.
// 12/31 하루만 걸면 그날 앱을 안 연 사용자는 영영 못 보므로 1주 유예를 둔다.

import { AppData, recordedYears } from '../storage';

// 지금이 자동 피날레 창 안이면 대상 연도, 밖이면 null
export function autoFinaleYear(now: Date): number | null {
  const m = now.getMonth(); // 0~11
  const d = now.getDate();
  if (m === 11 && d === 31) return now.getFullYear();
  if (m === 0 && d <= 7) return now.getFullYear() - 1;
  return null;
}

// 실제로 띄울지 최종 판정 — 창 안 + 그 해 기록 존재 + 아직 안 봤을 때만
export function shouldAutoFinale(data: AppData, now: Date): number | null {
  const year = autoFinaleYear(now);
  if (year == null) return null;
  if (data.finaleSeenYear === year) return null;
  if (!recordedYears(data.entries).includes(year)) return null;
  return year;
}
